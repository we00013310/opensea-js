import BigNumber from "bignumber.js";
import { WyvernProtocol } from "wyvern-js";
import * as ethUtil from "ethereumjs-util";
import * as _ from "lodash";
import * as Web3 from "web3";
import {
  AnnotatedFunctionABI,
  FunctionInputKind,
  FunctionOutputKind,
  Schema,
  StateMutability,
} from "wyvern-schemas/dist/types";
import { ERC1155 } from "../contracts";

import { OpenSeaPort } from "..";
import {
  Asset,
  AssetContractType,
  AssetEvent,
  ECSignature,
  OpenSeaAccount,
  OpenSeaAsset,
  OpenSeaAssetBundle,
  OpenSeaAssetContract,
  OpenSeaCollection,
  OpenSeaFungibleToken,
  OpenSeaTraitStats,
  OpenSeaUser,
  Order,
  OrderJSON,
  OrderSide,
  SaleKind,
  Transaction,
  TxnCallback,
  UnhashedOrder,
  UnsignedOrder,
  Web3Callback,
  WyvernAsset,
  WyvernBundle,
  WyvernFTAsset,
  WyvernNFTAsset,
  WyvernSchemaName,
} from "../types";
import {
  ENJIN_ADDRESS,
  ENJIN_COIN_ADDRESS,
  INVERSE_BASIS_POINT,
  NULL_ADDRESS,
  NULL_BLOCK_HASH,
} from "../constants";
import { proxyABI } from "../abi/Proxy";

export { WyvernProtocol };

export const annotateERC721TransferABI = (
  asset: WyvernNFTAsset
): AnnotatedFunctionABI => ({
  constant: false,
  inputs: [
    {
      name: "_to",
      type: "address",
      kind: FunctionInputKind.Replaceable,
    },
    {
      name: "_tokenId",
      type: "uint256",
      kind: FunctionInputKind.Asset,
      value: asset.id,
    },
  ],
  target: asset.address,
  name: "transfer",
  outputs: [],
  payable: false,
  stateMutability: StateMutability.Nonpayable,
  type: Web3.AbiType.Function,
});

export const annotateERC20TransferABI = (
  asset: WyvernFTAsset
): AnnotatedFunctionABI => ({
  constant: false,
  inputs: [
    {
      name: "_to",
      type: "address",
      kind: FunctionInputKind.Replaceable,
    },
    {
      name: "_amount",
      type: "uint256",
      kind: FunctionInputKind.Count,
      value: asset.quantity,
    },
  ],
  target: asset.address,
  name: "transfer",
  outputs: [
    {
      name: "success",
      type: "bool",
      kind: FunctionOutputKind.Other,
    },
  ],
  payable: false,
  stateMutability: StateMutability.Nonpayable,
  type: Web3.AbiType.Function,
});

const SCHEMA_NAME_TO_ASSET_CONTRACT_TYPE: {
  [key in WyvernSchemaName]: AssetContractType;
} = {
  [WyvernSchemaName.ERC721]: AssetContractType.NonFungible,
  [WyvernSchemaName.ERC1155]: AssetContractType.SemiFungible,
  [WyvernSchemaName.ERC20]: AssetContractType.Fungible,
  [WyvernSchemaName.LegacyEnjin]: AssetContractType.SemiFungible,
  [WyvernSchemaName.ENSShortNameAuction]: AssetContractType.NonFungible,
};

// OTHER

const txCallbacks: { [key: string]: TxnCallback[] } = {};

/**
 * Promisify a callback-syntax web3 function
 * @param inner callback function that accepts a Web3 callback function and passes
 * it to the Web3 function
 */
async function promisify<T>(inner: (fn: Web3Callback<T>) => void) {
  return new Promise<T>((resolve, reject) =>
    inner((err, res) => {
      if (err) {
        reject(err);
      }
      resolve(res);
    })
  );
}

/**
 * Promisify a call a method on a contract,
 * handling Parity errors. Returns '0x' if error.
 * Note that if T is not "string", this may return a falsey
 * value when the contract doesn't support the method (e.g. `isApprovedForAll`).
 * @param callback An anonymous function that takes a web3 callback
 * and returns a Web3 Contract's call result, e.g. `c => erc721.ownerOf(3, c)`
 * @param onError callback when user denies transaction
 */
export async function promisifyCall<T>(
  callback: (fn: Web3Callback<T>) => void,
  onError?: (error: Error) => void
): Promise<T | undefined> {
  try {
    const result: any = await promisify<T>(callback);
    if (result == "0x") {
      // Geth compatibility
      return undefined;
    }
    return result as T;
  } catch (error) {
    // Probably method not found, and web3 is a Parity node
    if (onError) {
      onError(error);
    } else {
      console.error(error);
    }
    return undefined;
  }
}

const track = (web3: Web3, txHash: string, onFinalized: TxnCallback) => {
  if (txCallbacks[txHash]) {
    txCallbacks[txHash].push(onFinalized);
  } else {
    txCallbacks[txHash] = [onFinalized];
    const poll = async () => {
      const tx = await promisify<Web3.Transaction>((c) =>
        web3.eth.getTransaction(txHash, c)
      );
      if (tx && tx.blockHash && tx.blockHash !== NULL_BLOCK_HASH) {
        const receipt = await promisify<Web3.TransactionReceipt | null>((c) =>
          web3.eth.getTransactionReceipt(txHash, c)
        );
        if (!receipt) {
          // Hack: assume success if no receipt
          console.warn("No receipt found for ", txHash);
        }
        const status = receipt
          ? parseInt((receipt.status || "0").toString()) == 1
          : true;
        txCallbacks[txHash].map((f) => f(status));
        delete txCallbacks[txHash];
      } else {
        setTimeout(poll, 1000);
      }
    };
    poll().catch();
  }
};

export const confirmTransaction = async (web3: Web3, txHash: string) => {
  return new Promise((resolve, reject) => {
    track(web3, txHash, (didSucceed: boolean) => {
      if (didSucceed) {
        resolve("Transaction complete!");
      } else {
        reject(
          new Error(
            `Transaction failed :( You might have already completed this action. See more on the mainnet at etherscan.io/tx/${txHash}`
          )
        );
      }
    });
  });
};

export const assetFromJSON = (asset: any): OpenSeaAsset => {
  const isAnimated = asset.image_url && asset.image_url.endsWith(".gif");
  const isSvg = asset.image_url && asset.image_url.endsWith(".svg");
  const fromJSON: OpenSeaAsset = {
    tokenId: asset.token_id.toString(),
    tokenAddress: asset.asset_contract.address,
    name: asset.name,
    description: asset.description,
    owner: asset.owner,
    assetContract: assetContractFromJSON(asset.asset_contract),
    collection: collectionFromJSON(asset.collection),
    orders: asset.orders ? asset.orders.map(orderFromJSON) : null,
    sellOrders: asset.sell_orders ? asset.sell_orders.map(orderFromJSON) : null,
    buyOrders: asset.buy_orders ? asset.buy_orders.map(orderFromJSON) : null,

    isPresale: asset.is_presale,
    // Don't use previews if it's a special image
    imageUrl:
      isAnimated || isSvg
        ? asset.image_url
        : asset.image_preview_url || asset.image_url,
    imagePreviewUrl: asset.image_preview_url,
    imageUrlOriginal: asset.image_original_url,
    imageUrlThumbnail: asset.image_thumbnail_url,

    externalLink: asset.external_link,
    openseaLink: asset.permalink,
    traits: asset.traits,
    numSales: asset.num_sales,
    lastSale: asset.last_sale ? assetEventFromJSON(asset.last_sale) : null,
    backgroundColor: asset.background_color
      ? `#${asset.background_color}`
      : null,

    transferFee: asset.transfer_fee ? makeBigNumber(asset.transfer_fee) : null,
    transferFeePaymentToken: asset.transfer_fee_payment_token
      ? tokenFromJSON(asset.transfer_fee_payment_token)
      : null,
  };
  // If orders were included, put them in sell/buy order groups
  if (fromJSON.orders && !fromJSON.sellOrders) {
    fromJSON.sellOrders = fromJSON.orders.filter(
      (o) => o.side == OrderSide.Sell
    );
  }
  if (fromJSON.orders && !fromJSON.buyOrders) {
    fromJSON.buyOrders = fromJSON.orders.filter((o) => o.side == OrderSide.Buy);
  }
  return fromJSON;
};

export const assetEventFromJSON = (assetEvent: any): AssetEvent => {
  return {
    eventType: assetEvent.event_type,
    eventTimestamp: assetEvent.event_timestamp,
    auctionType: assetEvent.auction_type,
    totalPrice: assetEvent.total_price,
    transaction: assetEvent.transaction
      ? transactionFromJSON(assetEvent.transaction)
      : null,
    paymentToken: assetEvent.payment_token
      ? tokenFromJSON(assetEvent.payment_token)
      : null,
  };
};

export const transactionFromJSON = (transaction: any): Transaction => {
  return {
    fromAccount: accountFromJSON(transaction.from_account),
    toAccount: accountFromJSON(transaction.to_account),
    createdDate: new Date(`${transaction.created_date}Z`),
    modifiedDate: new Date(`${transaction.modified_date}Z`),
    transactionHash: transaction.transaction_hash,
    transactionIndex: transaction.transaction_index,
    blockNumber: transaction.block_number,
    blockHash: transaction.block_hash,
    timestamp: new Date(`${transaction.timestamp}Z`),
  };
};

export const accountFromJSON = (account: any): OpenSeaAccount => {
  return {
    address: account.address,
    config: account.config,
    profileImgUrl: account.profile_img_url,
    user: account.user ? userFromJSON(account.user) : null,
  };
};

export const userFromJSON = (user: any): OpenSeaUser => {
  return {
    username: user.username,
  };
};

export const assetBundleFromJSON = (asset_bundle: any): OpenSeaAssetBundle => {
  const fromJSON: OpenSeaAssetBundle = {
    maker: asset_bundle.maker,
    assets: asset_bundle.assets.map(assetFromJSON),
    assetContract: asset_bundle.asset_contract
      ? assetContractFromJSON(asset_bundle.asset_contract)
      : undefined,
    name: asset_bundle.name,
    slug: asset_bundle.slug,
    description: asset_bundle.description,
    externalLink: asset_bundle.external_link,
    permalink: asset_bundle.permalink,

    sellOrders: asset_bundle.sell_orders
      ? asset_bundle.sell_orders.map(orderFromJSON)
      : null,
  };

  return fromJSON;
};

export const assetContractFromJSON = (
  asset_contract: any
): OpenSeaAssetContract => {
  return {
    name: asset_contract.name,
    description: asset_contract.description,
    type: asset_contract.asset_contract_type,
    schemaName: asset_contract.schema_name,
    address: asset_contract.address,
    tokenSymbol: asset_contract.symbol,
    buyerFeeBasisPoints: +asset_contract.buyer_fee_basis_points,
    sellerFeeBasisPoints: +asset_contract.seller_fee_basis_points,
    openseaBuyerFeeBasisPoints: +asset_contract.opensea_buyer_fee_basis_points,
    openseaSellerFeeBasisPoints:
      +asset_contract.opensea_seller_fee_basis_points,
    devBuyerFeeBasisPoints: +asset_contract.dev_buyer_fee_basis_points,
    devSellerFeeBasisPoints: +asset_contract.dev_seller_fee_basis_points,
    imageUrl: asset_contract.image_url,
    externalLink: asset_contract.external_link,
    wikiLink: asset_contract.wiki_link,
  };
};

export const collectionFromJSON = (collection: any): OpenSeaCollection => {
  const createdDate = new Date(`${collection.created_date}Z`);

  return {
    createdDate,
    name: collection.name,
    description: collection.description,
    slug: collection.slug,
    editors: collection.editors,
    hidden: collection.hidden,
    featured: collection.featured,
    featuredImageUrl: collection.featured_image_url,
    displayData: collection.display_data,
    paymentTokens: (collection.payment_tokens || []).map(tokenFromJSON),
    openseaBuyerFeeBasisPoints: +collection.opensea_buyer_fee_basis_points,
    openseaSellerFeeBasisPoints: +collection.opensea_seller_fee_basis_points,
    devBuyerFeeBasisPoints: +collection.dev_buyer_fee_basis_points,
    devSellerFeeBasisPoints: +collection.dev_seller_fee_basis_points,
    payoutAddress: collection.payout_address,
    imageUrl: collection.image_url,
    largeImageUrl: collection.large_image_url,
    stats: collection.stats,
    traitStats: collection.traits as OpenSeaTraitStats,
    externalLink: collection.external_url,
    wikiLink: collection.wiki_url,
  };
};

export const tokenFromJSON = (token: any): OpenSeaFungibleToken => {
  const fromJSON: OpenSeaFungibleToken = {
    name: token.name,
    symbol: token.symbol,
    decimals: token.decimals,
    address: token.address,
    imageUrl: token.image_url,
    ethPrice: token.eth_price,
    usdPrice: token.usd_price,
  };

  return fromJSON;
};

export const orderFromJSON = (order: any): Order => {
  const createdDate = new Date(`${order.created_date}Z`);

  const fromJSON: Order = {
    hash: order.order_hash || order.hash,
    cancelledOrFinalized: order.cancelled || order.finalized,
    markedInvalid: order.marked_invalid,
    metadata: order.metadata,
    quantity: new BigNumber(order.quantity || 1),
    exchange: order.exchange,
    makerAccount: order.maker,
    takerAccount: order.taker,
    // Use string address to conform to Wyvern Order schema
    maker: order.maker.address,
    taker: order.taker.address,
    makerRelayerFee: new BigNumber(order.maker_relayer_fee),
    takerRelayerFee: new BigNumber(order.taker_relayer_fee),
    makerProtocolFee: new BigNumber(order.maker_protocol_fee),
    takerProtocolFee: new BigNumber(order.taker_protocol_fee),
    makerReferrerFee: new BigNumber(order.maker_referrer_fee || 0),
    waitingForBestCounterOrder: order.fee_recipient.address == NULL_ADDRESS,
    feeMethod: order.fee_method,
    feeRecipientAccount: order.fee_recipient,
    feeRecipient: order.fee_recipient.address,
    side: order.side,
    saleKind: order.sale_kind,
    target: order.target,
    howToCall: order.how_to_call,
    calldata: order.calldata,
    replacementPattern: order.replacement_pattern,
    staticTarget: order.static_target,
    staticExtradata: order.static_extradata,
    paymentToken: order.payment_token,
    basePrice: new BigNumber(order.base_price),
    extra: new BigNumber(order.extra),
    currentBounty: new BigNumber(order.current_bounty || 0),
    currentPrice: new BigNumber(order.current_price || 0),

    createdTime: new BigNumber(Math.round(createdDate.getTime() / 1000)),
    listingTime: new BigNumber(order.listing_time),
    expirationTime: new BigNumber(order.expiration_time),

    salt: new BigNumber(order.salt),
    v: parseInt(order.v),
    r: order.r,
    s: order.s,

    paymentTokenContract: order.payment_token_contract
      ? tokenFromJSON(order.payment_token_contract)
      : undefined,
    asset: order.asset ? assetFromJSON(order.asset) : undefined,
    assetBundle: order.asset_bundle
      ? assetBundleFromJSON(order.asset_bundle)
      : undefined,
  };

  // Use client-side price calc, to account for buyer fee (not added by server) and latency
  fromJSON.currentPrice = estimateCurrentPrice(fromJSON);

  return fromJSON;
};

/**
 * Convert an order to JSON, hashing it as well if necessary
 * @param order order (hashed or unhashed)
 */
export const orderToJSON = (order: Order): OrderJSON => {
  const asJSON: OrderJSON = {
    exchange: order.exchange.toLowerCase(),
    maker: order.maker.toLowerCase(),
    taker: order.taker.toLowerCase(),
    makerRelayerFee: order.makerRelayerFee.toString(),
    takerRelayerFee: order.takerRelayerFee.toString(),
    makerProtocolFee: order.makerProtocolFee.toString(),
    takerProtocolFee: order.takerProtocolFee.toString(),
    makerReferrerFee: order.makerReferrerFee.toString(),
    feeMethod: order.feeMethod,
    feeRecipient: order.feeRecipient.toLowerCase(),
    side: order.side,
    saleKind: order.saleKind,
    target: order.target.toLowerCase(),
    howToCall: order.howToCall,
    calldata: order.calldata,
    replacementPattern: order.replacementPattern,
    staticTarget: order.staticTarget.toLowerCase(),
    staticExtradata: order.staticExtradata,
    paymentToken: order.paymentToken.toLowerCase(),
    quantity: order.quantity.toString(),
    basePrice: order.basePrice.toString(),
    englishAuctionReservePrice: order.englishAuctionReservePrice
      ? order.englishAuctionReservePrice.toString()
      : undefined,
    extra: order.extra.toString(),
    createdTime: order.createdTime ? order.createdTime.toString() : undefined,
    listingTime: order.listingTime.toString(),
    expirationTime: order.expirationTime.toString(),
    salt: order.salt.toString(),

    metadata: order.metadata,

    v: order.v,
    r: order.r,
    s: order.s,

    hash: order.hash,
  };
  return asJSON;
};

/**
 * Sign messages using web3 personal signatures
 * @param web3 Web3 instance
 * @param message message to sign
 * @param signerAddress web3 address signing the message
 * @returns A signature if provider can sign, otherwise null
 */
export async function personalSignAsync(
  web3: Web3,
  message: string,
  signerAddress: string
): Promise<ECSignature> {
  const signature = await promisify<Web3.JSONRPCResponsePayload>((c) =>
    web3.currentProvider.sendAsync(
      {
        method: "personal_sign",
        params: [message, signerAddress],
        from: signerAddress,
        id: new Date().getTime(),
      } as any,
      c
    )
  );

  const error = (signature as any).error;
  if (error) {
    throw new Error(error);
  }

  //
  return {
    ...parseSignatureHex(signature.result),
  };
}

/**
 * Checks whether a given address contains any code
 * @param web3 Web3 instance
 * @param address input address
 */
export async function isContractAddress(
  web3: Web3,
  address: string
): Promise<boolean> {
  const code = await promisify<string>((c) => web3.eth.getCode(address, c));
  return code !== "0x";
}

/**
 * Special fixes for making BigNumbers using web3 results
 * @param arg An arg or the result of a web3 call to turn into a BigNumber
 */
export function makeBigNumber(arg: number | string | BigNumber): BigNumber {
  // Zero sometimes returned as 0x from contracts
  if (arg === "0x") {
    arg = 0;
  }
  // fix "new BigNumber() number type has more than 15 significant digits"
  arg = arg.toString();
  return new BigNumber(arg);
}

/**
 * Send a transaction to the blockchain and optionally confirm it
 * @param web3 Web3 instance
 * @param param0 __namedParameters
 * @param from address sending transaction
 * @param to destination contract address
 * @param data data to send to contract
 * @param gasPrice gas price to use. If unspecified, uses web3 default (mean gas price)
 * @param value value in ETH to send with data. Defaults to 0
 * @param onError callback when user denies transaction
 */
export async function sendRawTransaction(
  web3: Web3,
  { from, to, data, gasPrice, value = 0, gas }: Web3.TxData,
  onError: (error: Error) => void
): Promise<string> {
  if (gas == null) {
    // This gas cannot be increased due to an ethjs error
    gas = await estimateGas(web3, { from, to, data, value });
  }

  try {
    const txHashRes = await promisify<string>((c) =>
      web3.eth.sendTransaction(
        {
          from,
          to,
          value,
          data,
          gas,
          gasPrice,
        },
        c
      )
    );
    return txHashRes.toString();
  } catch (error) {
    onError(error);
    throw error;
  }
}

/**
 * Call a method on a contract, sending arbitrary data and
 * handling Parity errors. Returns '0x' if error.
 * @param web3 Web3 instance
 * @param param0 __namedParameters
 * @param from address sending call
 * @param to destination contract address
 * @param data data to send to contract
 * @param onError callback when user denies transaction
 */
export async function rawCall(
  web3: Web3,
  { from, to, data }: Web3.CallData,
  onError?: (error: Error) => void
): Promise<string> {
  try {
    const result = await promisify<string>((c) =>
      web3.eth.call(
        {
          from,
          to,
          data,
        },
        c
      )
    );
    return result;
  } catch (error) {
    // Probably method not found, and web3 is a Parity node
    if (onError) {
      onError(error);
    }
    // Backwards compatibility with Geth nodes
    return "0x";
  }
}

/**
 * Estimate Gas usage for a transaction
 * @param web3 Web3 instance
 * @param from address sending transaction
 * @param to destination contract address
 * @param data data to send to contract
 * @param value value in ETH to send with data
 */
export async function estimateGas(
  web3: Web3,
  { from, to, data, value = 0 }: Web3.TxData
): Promise<number> {
  const amount = await promisify<number>((c) =>
    web3.eth.estimateGas(
      {
        from,
        to,
        value,
        data,
      },
      c
    )
  );

  return amount;
}

/**
 * Get mean gas price for sending a txn, in wei
 * @param web3 Web3 instance
 */
export async function getCurrentGasPrice(web3: Web3): Promise<BigNumber> {
  const meanGas = await promisify<BigNumber>((c) => web3.eth.getGasPrice(c));
  return meanGas;
}

/**
 * Get current transfer fees for an asset
 * @param web3 Web3 instance
 * @param asset The asset to check for transfer fees
 */
export async function getTransferFeeSettings(
  web3: Web3,
  {
    asset,
    accountAddress,
  }: {
    asset: Asset;
    accountAddress?: string;
  }
) {
  let transferFee: BigNumber | undefined;
  let transferFeeTokenAddress: string | undefined;

  if (asset.tokenAddress.toLowerCase() == ENJIN_ADDRESS.toLowerCase()) {
    // Enjin asset
    const feeContract = web3.eth
      .contract(ERC1155 as any)
      .at(asset.tokenAddress);

    const params = await promisifyCall<any[]>((c) =>
      feeContract.transferSettings(asset.tokenId, { from: accountAddress }, c)
    );
    if (params) {
      transferFee = makeBigNumber(params[3]);
      if (params[2] == 0) {
        transferFeeTokenAddress = ENJIN_COIN_ADDRESS;
      }
    }
  }
  return { transferFee, transferFeeTokenAddress };
}

// sourced from 0x.js:
// https://github.com/ProjectWyvern/wyvern-js/blob/39999cb93ce5d80ea90b4382182d1bd4339a9c6c/src/utils/signature_utils.ts
function parseSignatureHex(signature: string): ECSignature {
  // HACK: There is no consensus on whether the signatureHex string should be formatted as
  // v + r + s OR r + s + v, and different clients (even different versions of the same client)
  // return the signature params in different orders. In order to support all client implementations,
  // we parse the signature in both ways, and evaluate if either one is a valid signature.
  const validVParamValues = [27, 28];

  const ecSignatureRSV = _parseSignatureHexAsRSV(signature);
  if (_.includes(validVParamValues, ecSignatureRSV.v)) {
    return ecSignatureRSV;
  }

  // For older clients
  const ecSignatureVRS = _parseSignatureHexAsVRS(signature);
  if (_.includes(validVParamValues, ecSignatureVRS.v)) {
    return ecSignatureVRS;
  }

  throw new Error("Invalid signature");

  function _parseSignatureHexAsVRS(signatureHex: string) {
    const signatureBuffer: any = ethUtil.toBuffer(signatureHex);
    let v = signatureBuffer[0];
    if (v < 27) {
      v += 27;
    }
    const r = signatureBuffer.slice(1, 33);
    const s = signatureBuffer.slice(33, 65);
    const ecSignature = {
      v,
      r: ethUtil.bufferToHex(r),
      s: ethUtil.bufferToHex(s),
    };
    return ecSignature;
  }

  function _parseSignatureHexAsRSV(signatureHex: string) {
    const { v, r, s } = ethUtil.fromRpcSig(signatureHex);
    const ecSignature = {
      v,
      r: ethUtil.bufferToHex(r),
      s: ethUtil.bufferToHex(s),
    };
    return ecSignature;
  }
}

/**
 * Estimates the price of an order
 * @param order The order to estimate price on
 * @param secondsToBacktrack The number of seconds to subtract on current time,
 *  to fix race conditions
 * @param shouldRoundUp Whether to round up fractional wei
 */
export function estimateCurrentPrice(
  order: Order,
  secondsToBacktrack = 30,
  shouldRoundUp = true
) {
  let { basePrice, listingTime, expirationTime, extra } = order;
  const { side, takerRelayerFee, saleKind } = order;

  const now = new BigNumber(Math.round(Date.now() / 1000)).minus(
    secondsToBacktrack
  );
  basePrice = new BigNumber(basePrice);
  listingTime = new BigNumber(listingTime);
  expirationTime = new BigNumber(expirationTime);
  extra = new BigNumber(extra);

  let exactPrice = basePrice;

  if (saleKind === SaleKind.FixedPrice) {
    // Do nothing, price is correct
  } else if (saleKind === SaleKind.DutchAuction) {
    const diff = extra
      .times(now.minus(listingTime))
      .dividedBy(expirationTime.minus(listingTime));

    exactPrice =
      side == OrderSide.Sell
        ? /* Sell-side - start price: basePrice. End price: basePrice - extra. */
          basePrice.minus(diff)
        : /* Buy-side - start price: basePrice. End price: basePrice + extra. */
          basePrice.plus(diff);
  }

  // Add taker fee only for buyers
  if (side === OrderSide.Sell && !order.waitingForBestCounterOrder) {
    // Buyer fee increases sale price
    exactPrice = exactPrice.times(+takerRelayerFee / INVERSE_BASIS_POINT + 1);
  }

  return shouldRoundUp ? exactPrice.ceil() : exactPrice;
}

/**
 * Get the Wyvern representation of a fungible asset
 * @param schema The WyvernSchema needed to access this asset
 * @param asset The asset to trade
 * @param quantity The number of items to trade
 */
export function getWyvernAsset(
  schema: Schema<WyvernAsset>,
  asset: Asset,
  quantity = new BigNumber(1)
): WyvernAsset {
  const tokenId = asset.tokenId != null ? asset.tokenId.toString() : undefined;

  return schema.assetFromFields({
    ID: tokenId,
    Quantity: quantity.toString(),
    Address: asset.tokenAddress.toLowerCase(),
    Name: asset.name,
  });
}

/**
 * Get the Wyvern representation of a group of assets
 * Sort order is enforced here. Throws if there's a duplicate.
 * @param assets Assets to bundle
 * @param schemas The WyvernSchemas needed to access each asset, respectively
 * @param quantities The quantity of each asset to bundle, respectively
 */
export function getWyvernBundle(
  assets: Asset[],
  schemas: Array<Schema<WyvernAsset>>,
  quantities: BigNumber[]
): WyvernBundle {
  if (assets.length != quantities.length) {
    throw new Error("Bundle must have a quantity for every asset");
  }

  if (assets.length != schemas.length) {
    throw new Error("Bundle must have a schema for every asset");
  }

  const wyAssets = assets.map((asset, i) =>
    getWyvernAsset(schemas[i], asset, quantities[i])
  );

  const sorters = [
    (assetAndSchema: { asset: WyvernAsset; schema: WyvernSchemaName }) =>
      assetAndSchema.asset.address,
    (assetAndSchema: { asset: WyvernAsset; schema: WyvernSchemaName }) =>
      assetAndSchema.asset.id || 0,
  ];

  const wyAssetsAndSchemas = wyAssets.map((asset, i) => ({
    asset,
    schema: schemas[i].name as WyvernSchemaName,
  }));

  const uniqueAssets = _.uniqBy(
    wyAssetsAndSchemas,
    (group) => `${sorters[0](group)}-${sorters[1](group)}`
  );

  if (uniqueAssets.length != wyAssetsAndSchemas.length) {
    throw new Error("Bundle can't contain duplicate assets");
  }

  const sortedWyAssetsAndSchemas = _.sortBy(wyAssetsAndSchemas, sorters);

  return {
    assets: sortedWyAssetsAndSchemas.map((group) => group.asset),
    schemas: sortedWyAssetsAndSchemas.map((group) => group.schema),
  };
}

/**
 * Get the non-prefixed hash for the order
 * (Fixes a Wyvern typescript issue and casing issue)
 * @param order order to hash
 */
export function getOrderHash(order: UnhashedOrder) {
  const orderWithStringTypes = {
    ...order,
    maker: order.maker.toLowerCase(),
    taker: order.taker.toLowerCase(),
    feeRecipient: order.feeRecipient.toLowerCase(),
    side: order.side.toString(),
    saleKind: order.saleKind.toString(),
    howToCall: order.howToCall.toString(),
    feeMethod: order.feeMethod.toString(),
  };
  // console.log("orderWithStringTypes", orderWithStringTypes);
  return WyvernProtocol.getOrderHashHex(orderWithStringTypes as any);
}

/**
 * Assign an order and a new matching order to their buy/sell sides
 * @param order Original order
 * @param matchingOrder The result of _makeMatchingOrder
 */
export function assignOrdersToSides(
  order: Order,
  matchingOrder: UnsignedOrder
): { buy: Order; sell: Order } {
  const isSellOrder = order.side == OrderSide.Sell;

  let buy: Order;
  let sell: Order;
  if (!isSellOrder) {
    buy = order;
    sell = {
      ...matchingOrder,
      v: buy.v,
      r: buy.r,
      s: buy.s,
    };
  } else {
    sell = order;
    buy = {
      ...matchingOrder,
      v: sell.v,
      r: sell.r,
      s: sell.s,
    };
  }

  return { buy, sell };
}

// BROKEN
// TODO fix this calldata for buy orders
async function canSettleOrder(
  client: OpenSeaPort,
  order: Order,
  matchingOrder: Order
): Promise<boolean> {
  // HACK that doesn't always work
  //  to change null address to 0x1111111... for replacing calldata
  const calldata =
    order.calldata.slice(0, 98) +
    "1111111111111111111111111111111111111111" +
    order.calldata.slice(138);

  const seller =
    order.side == OrderSide.Buy ? matchingOrder.maker : order.maker;
  const proxy = await client._getProxy(seller);
  if (!proxy) {
    console.warn(`No proxy found for seller ${seller}`);
    return false;
  }
  const contract = client.web3.eth.contract([proxyABI]).at(proxy);
  return promisify<boolean>((c) =>
    contract.proxy.call(
      order.target,
      order.howToCall,
      calldata,
      { from: seller },
      c
    )
  );
}

/**
 * Delay using setTimeout
 * @param ms milliseconds to wait
 */
export async function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * Validates that an address exists, isn't null, and is properly
 * formatted for Wyvern and OpenSea
 * @param address input address
 */
export function validateAndFormatWalletAddress(
  web3: Web3,
  address: string
): string {
  if (!address) {
    throw new Error("No wallet address found");
  }
  // if (!web3.isAddress(address)) {
  //   throw new Error("Invalid wallet address");
  // }
  if (address == NULL_ADDRESS) {
    throw new Error("Wallet cannot be the null address");
  }
  return address.toLowerCase();
}

/**
 * Notify developer when a pattern will be deprecated
 * @param msg message to log to console
 */
export function onDeprecated(msg: string) {
  console.warn(`DEPRECATION NOTICE: ${msg}`);
}

/**
 * Get special-case approval addresses for an erc721 contract
 * @param erc721Contract contract to check
 */
export async function getNonCompliantApprovalAddress(
  erc721Contract: Web3.ContractInstance,
  tokenId: string,
  accountAddress: string
): Promise<string | undefined> {
  const results = await Promise.all([
    // CRYPTOKITTIES check
    promisifyCall<string>((c) =>
      erc721Contract.kittyIndexToApproved.call(tokenId, c)
    ),
    // Etherbots check
    promisifyCall<string>((c) =>
      erc721Contract.partIndexToApproved.call(tokenId, c)
    ),
  ]);

  return _.compact(results)[0];
}

export function createFakeAsset({
  tokenId,
  tokenAddress,
  schemaName = "ERC1155",
}: {
  tokenId: string;
  tokenAddress: string;
  schemaName: string;
}) {
  if (schemaName === "ERC721") {
    return {
      id: tokenId,
      token_id: tokenId,
      num_sales: 0,
      background_color: null,
      image_url:
        "https://storage.googleapis.com/ck-kitty-image/0x06012c8cf97bead5deae237070f9587f8e7a266d/0.svg",
      image_preview_url:
        "https://storage.googleapis.com/ck-kitty-image/0x06012c8cf97bead5deae237070f9587f8e7a266d/0.svg",
      image_thumbnail_url: null,
      image_original_url: null,
      animation_url: null,
      animation_original_url: null,
      name: "Manga NFT 721",
      description: null,
      external_link: "https://www.cryptokitties.co/kitty/0",
      asset_contract: {
        address: tokenAddress,
        asset_contract_type: "non-fungible",
        created_date: "2018-01-23T04:51:38.832339",
        name: "CryptoKitties",
        nft_version: "1.0",
        opensea_version: null,
        owner: 463841,
        schema_name: "ERC721",
        symbol: "CKITTY",
        total_supply: null,
        description:
          "CryptoKitties is a game centered around breedable, collectible, and oh-so-adorable creatures we call CryptoKitties! Each cat is one-of-a-kind and 100% owned by you; it cannot be replicated, taken away, or destroyed.",
        external_link: "https://www.cryptokitties.co/",
        image_url:
          "https://lh3.googleusercontent.com/C272ZRW1RGGef9vKMePFSCeKc1Lw6U40wl9ofNVxzUxFdj84hH9xJRQNf-7wgs7W8qw8RWe-1ybKp-VKuU5D-tg=s60",
        default_to_fiat: false,
        dev_buyer_fee_basis_points: 0,
        dev_seller_fee_basis_points: 0,
        only_proxied_transfers: false,
        opensea_buyer_fee_basis_points: 0,
        opensea_seller_fee_basis_points: 250,
        buyer_fee_basis_points: 0,
        seller_fee_basis_points: 250,
        payout_address: null,
      },
      permalink:
        "https://opensea.io/assets/0x06012c8cf97bead5deae237070f9587f8e7a266d/0",
      collection: {
        payment_tokens: [
          {
            id: 5098533,
            symbol: "RFR",
            address: "0xd0929d411954c47438dc1d871dd6081f5c5e149c",
            image_url:
              "https://lh3.googleusercontent.com/XB1KohVuy2E87R324IGijVhDZeHKhlkiB_TcpAH8sVTCdaA5brsYyxYXNzFK6SE2qGAtfya7FVzB9rgJBYQrjJVqeA",
            name: null,
            decimals: 4,
            eth_price: 1.078455134e-5,
            usd_price: 0.02168627,
          },
          {
            id: 13689077,
            symbol: "ETH",
            address: "0x0000000000000000000000000000000000000000",
            image_url:
              "https://storage.opensea.io/files/6f8e2979d428180222796ff4a33ab929.svg",
            name: "Ether",
            decimals: 18,
            eth_price: 1.0,
            usd_price: 4308.2,
          },
          {
            id: 4645815,
            symbol: "GUSD",
            address: "0x056fd409e1d7a124bd7017459dfea2f387b6d5cd",
            image_url:
              "https://lh3.googleusercontent.com/MLKbcx1oxhZjkXzsQM-fju8R3hHqsu-mGpFzivWMadH7bXT_kw48-rrD6os594lPY0x7MU-QGLy4ZudX1ePTx-Y",
            name: "Gemini dollar",
            decimals: 2,
            eth_price: 0.00056390042182,
            usd_price: 1.0,
          },
          {
            id: 12182941,
            symbol: "DAI",
            address: "0x6b175474e89094c44da98b954eedeac495271d0f",
            image_url:
              "https://storage.opensea.io/files/8ef8fb3fe707f693e57cdbfea130c24c.svg",
            name: "Dai Stablecoin",
            decimals: 18,
            eth_price: 0.00023278,
            usd_price: 1.0,
          },
          {
            id: 4645681,
            symbol: "WETH",
            address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
            image_url:
              "https://storage.opensea.io/files/accae6b6fb3888cbff27a013729c22dc.svg",
            name: "Wrapped Ether",
            decimals: 18,
            eth_price: 1.0,
            usd_price: 4308.2,
          },
          {
            id: 4403908,
            symbol: "USDC",
            address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
            image_url:
              "https://storage.opensea.io/files/749015f009a66abcb3bbb3502ae2f1ce.svg",
            name: "USD Coin",
            decimals: 6,
            eth_price: 0.00023293,
            usd_price: 1.0,
          },
          {
            id: 4645691,
            symbol: "WCK",
            address: "0x09fe5f0236f0ea5d930197dce254d77b04128075",
            image_url:
              "https://lh3.googleusercontent.com/L5nvau4G9vXrA4AUs8OLxddBBEQHQZgUuUqnv9PzGo5mMgDm3_7pKhy8HPeWnqYCqKBi3MkhY6vpzq0HnV4aAEY",
            name: "Wrapped CryptoKitties",
            decimals: 18,
            eth_price: 0.003858847984609,
            usd_price: 7.84,
          },
          {
            id: 16206959,
            symbol: "CHERRY",
            address: "0x0eed7d6564fae0c22a7dc9ebb3db4a4c4a1473ee",
            image_url:
              "https://lh3.googleusercontent.com/DRoQ7e9zCHgk8CLcTpKxYTIIFyG8qzlsW3wPFY_NiVVdScylei8jbXHua49Bp--j7tNIvTYxftIwpEuatgUxsN8AeA",
            name: "Cherry",
            decimals: 18,
            eth_price: 3.39e-6,
            usd_price: 0.01465228,
          },
        ],
        primary_asset_contracts: [
          {
            address: "0x06012c8cf97bead5deae237070f9587f8e7a266d",
            asset_contract_type: "non-fungible",
            created_date: "2018-01-23T04:51:38.832339",
            name: "CryptoKitties",
            nft_version: "1.0",
            opensea_version: null,
            owner: 463841,
            schema_name: "ERC721",
            symbol: "CKITTY",
            total_supply: null,
            description:
              "CryptoKitties is a game centered around breedable, collectible, and oh-so-adorable creatures we call CryptoKitties! Each cat is one-of-a-kind and 100% owned by you; it cannot be replicated, taken away, or destroyed.",
            external_link: "https://www.cryptokitties.co/",
            image_url:
              "https://lh3.googleusercontent.com/C272ZRW1RGGef9vKMePFSCeKc1Lw6U40wl9ofNVxzUxFdj84hH9xJRQNf-7wgs7W8qw8RWe-1ybKp-VKuU5D-tg=s60",
            default_to_fiat: false,
            dev_buyer_fee_basis_points: 0,
            dev_seller_fee_basis_points: 0,
            only_proxied_transfers: false,
            opensea_buyer_fee_basis_points: 0,
            opensea_seller_fee_basis_points: 250,
            buyer_fee_basis_points: 0,
            seller_fee_basis_points: 250,
            payout_address: null,
          },
        ],
        traits: {
          generation: {
            min: 0,
            max: 4593,
          },
          fancy_ranking: {
            min: 1,
            max: 10000,
          },
          cooldown_index: {
            min: 0,
            max: 13,
          },
          purrstige_ranking: {
            min: 1,
            max: 2480,
          },
        },
        stats: {
          one_day_volume: 9.52608424875555,
          one_day_change: 2.5790294450125315,
          one_day_sales: 71.0,
          one_day_average_price: 0.13417020068669788,
          seven_day_volume: 19.5147201372279,
          seven_day_change: 0.8478926971835331,
          seven_day_sales: 415.0,
          seven_day_average_price: 0.047023422017416626,
          thirty_day_volume: 87.4913976572758,
          thirty_day_change: -0.7241122203666088,
          thirty_day_sales: 1782.0,
          thirty_day_average_price: 0.04909730508264635,
          total_volume: 69822.5459540869,
          total_sales: 771402.0,
          total_supply: 2009506.0,
          count: 2009506.0,
          num_owners: 109740,
          average_price: 0.09051382541669183,
          num_reports: 30,
          market_cap: 94493.84868453082,
          floor_price: 0,
        },
        banner_image_url:
          "https://storage.opensea.io/static/banners/cryptokitties-banner2.png",
        chat_url: null,
        created_date: "2019-04-26T22:13:04.207050",
        default_to_fiat: false,
        description:
          "CryptoKitties is a game centered around breedable, collectible, and oh-so-adorable creatures we call CryptoKitties! Each cat is one-of-a-kind and 100% owned by you; it cannot be replicated, taken away, or destroyed.",
        dev_buyer_fee_basis_points: "0",
        dev_seller_fee_basis_points: "0",
        discord_url: "https://discord.gg/cryptokitties",
        display_data: {
          card_display_style: "padded",
        },
        external_url: "https://www.cryptokitties.co/",
        featured: false,
        featured_image_url:
          "https://storage.opensea.io/0x06012c8cf97bead5deae237070f9587f8e7a266d-featured-1556589429.png",
        hidden: false,
        safelist_request_status: "verified",
        image_url:
          "https://lh3.googleusercontent.com/C272ZRW1RGGef9vKMePFSCeKc1Lw6U40wl9ofNVxzUxFdj84hH9xJRQNf-7wgs7W8qw8RWe-1ybKp-VKuU5D-tg=s60",
        is_subject_to_whitelist: false,
        large_image_url:
          "https://lh3.googleusercontent.com/C272ZRW1RGGef9vKMePFSCeKc1Lw6U40wl9ofNVxzUxFdj84hH9xJRQNf-7wgs7W8qw8RWe-1ybKp-VKuU5D-tg",
        medium_username: null,
        name: "CryptoKitties",
        only_proxied_transfers: false,
        opensea_buyer_fee_basis_points: "0",
        opensea_seller_fee_basis_points: "250",
        payout_address: null,
        require_email: false,
        short_description: null,
        slug: "cryptokitties",
        telegram_url: null,
        twitter_username: "CryptoKitties",
        instagram_username: null,
        wiki_url: "https://opensea.readme.io/page/cryptokitties",
      },
      decimals: null,
      token_metadata: "",
      owner: {
        user: {
          username: "NullAddress",
        },
        profile_img_url:
          "https://storage.googleapis.com/opensea-static/opensea-profile/1.png",
        address: "0x0000000000000000000000000000000000000000",
        config: "",
      },
      sell_orders: null,
      creator: {
        user: null,
        profile_img_url:
          "https://storage.googleapis.com/opensea-static/opensea-profile/3.png",
        address: "0xba52c75764d6f594735dc735be7f1830cdf58ddf",
        config: "",
      },
      traits: [],
      last_sale: null,
      top_bid: null,
      listing_date: null,
      is_presale: false,
      transfer_fee_payment_token: null,
      transfer_fee: null,
      related_assets: [],
      orders: [
        {
          created_date: "2019-05-20T21:58:57.083557",
          closing_date: null,
          closing_extendable: false,
          expiration_time: 0,
          listing_time: 1558389413,
          order_hash:
            "0x98ef717da657603cd90733a3e1036622c823e6bd82842d8245fbf6582cf19df2",
          metadata: {
            asset: {
              id: "0",
              address: "0x06012c8cf97bead5deae237070f9587f8e7a266d",
            },
            schema: "ERC721",
          },
          exchange: "0x7be8076f4ea4a4ad08075c2508e481d6c946d12b",
          maker: {
            user: {
              username: "Kohya",
            },
            profile_img_url:
              "https://storage.googleapis.com/opensea-static/opensea-profile/33.png",
            address: "0x4884b3a2c3d7fad7627fad543abf0c9e2148edf9",
            config: "affiliate",
          },
          taker: {
            user: {
              username: "NullAddress",
            },
            profile_img_url:
              "https://storage.googleapis.com/opensea-static/opensea-profile/1.png",
            address: "0x0000000000000000000000000000000000000000",
            config: "",
          },
          current_price: "100000000000000",
          current_bounty: "1000000000000",
          bounty_multiple: "0.01",
          maker_relayer_fee: "0",
          taker_relayer_fee: "0",
          maker_protocol_fee: "0",
          taker_protocol_fee: "0",
          maker_referrer_fee: "0",
          fee_recipient: {
            user: {
              username: "OS-Wallet",
            },
            profile_img_url:
              "https://storage.googleapis.com/opensea-static/opensea-profile/28.png",
            address: "0x5b3256965e7c3cf26e11fcaf296dfc8807c01073",
            config: "verified",
          },
          fee_method: 1,
          side: 0,
          sale_kind: 0,
          target: "0x06012c8cf97bead5deae237070f9587f8e7a266d",
          how_to_call: 0,
          calldata:
            "0x23b872dd00000000000000000000000000000000000000000000000000000000000000000000000000000000000000004884b3a2c3d7fad7627fad543abf0c9e2148edf90000000000000000000000000000000000000000000000000000000000000000",
          replacement_pattern:
            "0x00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
          static_target: "0x0000000000000000000000000000000000000000",
          static_extradata: "0x",
          payment_token: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
          payment_token_contract: {
            id: 2,
            symbol: "WETH",
            address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
            image_url:
              "https://storage.opensea.io/files/accae6b6fb3888cbff27a013729c22dc.svg",
            name: "Wrapped Ether",
            decimals: 18,
            eth_price: "1.000000000000000",
            usd_price: "4308.199999999999818000",
          },
          base_price: "100000000000000",
          extra: "0",
          quantity: "1",
          salt: "64725274549790374289212800427449654236778665813782580556057505958447422028749",
          v: 0,
          r: "",
          s: "",
          approved_on_chain: true,
          cancelled: false,
          finalized: false,
          marked_invalid: false,
          prefixed_hash:
            "0x1256af3c58e805e2c934c1ddcc61b30384057624ff3ae134a97fa0440e9ab2a8",
        },
      ],
      auctions: [],
      supports_wyvern: true,
      top_ownerships: [
        {
          owner: {
            user: {
              username: "NullAddress",
            },
            profile_img_url:
              "https://storage.googleapis.com/opensea-static/opensea-profile/1.png",
            address: "0x0000000000000000000000000000000000000000",
            config: "",
          },
          quantity: "1",
        },
      ],
      ownership: null,
      highest_buyer_commitment: null,
    };
  }
  return {
    id: tokenId,
    token_id: tokenId,
    num_sales: 0,
    background_color: null,
    image_url:
      "https://lh3.googleusercontent.com/bv54wFuLUjQ4z4MQHmEm-TGSVhULh3ccctx3vAtxao7wleO1HV6nxwvrJrZxGNPwLzBA_3nrfY88r37H0zvnTioGbo5yZb_eHuLmJA",
    image_preview_url:
      "https://lh3.googleusercontent.com/bv54wFuLUjQ4z4MQHmEm-TGSVhULh3ccctx3vAtxao7wleO1HV6nxwvrJrZxGNPwLzBA_3nrfY88r37H0zvnTioGbo5yZb_eHuLmJA=s250",
    image_thumbnail_url:
      "https://lh3.googleusercontent.com/bv54wFuLUjQ4z4MQHmEm-TGSVhULh3ccctx3vAtxao7wleO1HV6nxwvrJrZxGNPwLzBA_3nrfY88r37H0zvnTioGbo5yZb_eHuLmJA=s128",
    image_original_url: null,
    animation_url: null,
    animation_original_url: null,
    name: tokenId,
    description: null,
    external_link: null,
    asset_contract: {
      address: tokenAddress,
      asset_contract_type: "semi-fungible",
      created_date: "2021-05-17T18:22:26.262750",
      name: "My Collectibles",
      nft_version: null,
      opensea_version: "2.1.0",
      owner: 676,
      schema_name: "ERC1155",
      symbol: "OPENSTORE",
      total_supply: null,
      description: null,
      external_link: null,
      image_url: null,
      default_to_fiat: false,
      dev_buyer_fee_basis_points: 0,
      dev_seller_fee_basis_points: 0,
      only_proxied_transfers: false,
      opensea_buyer_fee_basis_points: 0,
      opensea_seller_fee_basis_points: 250,
      buyer_fee_basis_points: 0,
      seller_fee_basis_points: 250,
      payout_address: null,
    },
    permalink:
      "https://testnets.opensea.io/assets/0x88b48f654c30e99bc2e4a1559b4dcf1ad93fa656/72506337805396774008870872080979638262350033986330700370714622750499255877633",
    collection: {
      payment_tokens: [
        {
          id: 382494,
          symbol: "BNB",
          address: "0x0000000000000000000000000000000000000000",
          image_url:
            "https://storage.opensea.io/files/6f8e2979d428180222796ff4a33ab929.svg",
          name: null,
          decimals: 18,
          eth_price: 1,
          usd_price: 305.65,
        },
        {
          id: 180476,
          symbol: "WETH",
          address: "0xc778417e063141139fce010982780140aa0cd5ab",
          image_url:
            "https://storage.opensea.io/files/accae6b6fb3888cbff27a013729c22dc.svg",
          name: "",
          decimals: 18,
          eth_price: 5.011931468014298,
          usd_price: 2033.09,
        },
      ],
      primary_asset_contracts: [],
      traits: {},
      stats: {
        one_day_volume: 0,
        one_day_change: 0,
        one_day_sales: 0,
        one_day_average_price: 0,
        seven_day_volume: 0,
        seven_day_change: 0,
        seven_day_sales: 0,
        seven_day_average_price: 0,
        thirty_day_volume: 0,
        thirty_day_change: 0,
        thirty_day_sales: 0,
        thirty_day_average_price: 0,
        total_volume: 0,
        total_sales: 0,
        total_supply: 0,
        count: 0,
        num_owners: 0,
        average_price: 0,
        num_reports: 0,
        market_cap: 0,
      },
      banner_image_url: null,
      chat_url: null,
      created_date: "2021-07-13T12:08:40.089430",
      default_to_fiat: false,
      description: "test dpet",
      dev_buyer_fee_basis_points: "0",
      dev_seller_fee_basis_points: "0",
      discord_url: null,
      display_data: {
        card_display_style: "contain",
        images: [],
      },
      external_url: null,
      featured: false,
      featured_image_url: null,
      hidden: false,
      safelist_request_status: "not_requested",
      image_url:
        "https://lh3.googleusercontent.com/140EDkVeUhvKAhnVR_4YayDl4lmdDNqvOpUoicFAoNEcUc4Noe7DAOdHLHs7Iwd95RDLeM2_uKeV1CXZC4uFuMEpe5J4W-3Ec3rA1Q=s120",
      is_subject_to_whitelist: false,
      large_image_url: null,
      medium_username: null,
      name: "test dpet",
      only_proxied_transfers: false,
      opensea_buyer_fee_basis_points: "0",
      opensea_seller_fee_basis_points: "250",
      payout_address: null,
      require_email: false,
      short_description: null,
      slug: "test-dpet",
      telegram_url: null,
      twitter_username: null,
      instagram_username: null,
      wiki_url: null,
    },
    decimals: null,
    token_metadata: null,
    owner: {
      user: {
        username: "NullAddress",
      },
      profile_img_url:
        "https://storage.googleapis.com/opensea-static/opensea-profile/1.png",
      address: "0x0000000000000000000000000000000000000000",
      config: "",
      discord_id: "",
    },
    sell_orders: null,
    creator: {
      user: {
        username: null,
      },
      profile_img_url:
        "https://storage.googleapis.com/opensea-static/opensea-profile/10.png",
      address: "0xCcd6cc00981952cA24e3ED61fE84B784f9cec9da",
      config: "",
      discord_id: "",
    },
    traits: [],
    last_sale: null,
    top_bid: null,
    listing_date: null,
    is_presale: true,
    transfer_fee_payment_token: null,
    transfer_fee: null,
    related_assets: [],
    orders: [],
    auctions: [],
    supports_wyvern: true,
    top_ownerships: [
      {
        owner: {
          user: {
            username: null,
          },
          profile_img_url:
            "https://storage.googleapis.com/opensea-static/opensea-profile/10.png",
          address: "0xCcd6cc00981952cA24e3ED61fE84B784f9cec9da",
          config: "",
          discord_id: "",
        },
        quantity: "1",
      },
    ],
    ownership: null,
    highest_buyer_commitment: null,
  };
}
