"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var _a;
var _this = this;
var bignumber_js_1 = require("bignumber.js");
var wyvern_js_1 = require("wyvern-js");
exports.WyvernProtocol = wyvern_js_1.WyvernProtocol;
var ethUtil = require("ethereumjs-util");
var _ = require("lodash");
var Web3 = require("web3");
var types_1 = require("wyvern-schemas/dist/types");
var contracts_1 = require("../contracts");
var types_2 = require("../types");
var constants_1 = require("../constants");
var Proxy_1 = require("../abi/Proxy");
exports.annotateERC721TransferABI = function (asset) { return ({
    constant: false,
    inputs: [
        {
            name: "_to",
            type: "address",
            kind: types_1.FunctionInputKind.Replaceable,
        },
        {
            name: "_tokenId",
            type: "uint256",
            kind: types_1.FunctionInputKind.Asset,
            value: asset.id,
        },
    ],
    target: asset.address,
    name: "transfer",
    outputs: [],
    payable: false,
    stateMutability: types_1.StateMutability.Nonpayable,
    type: Web3.AbiType.Function,
}); };
exports.annotateERC20TransferABI = function (asset) { return ({
    constant: false,
    inputs: [
        {
            name: "_to",
            type: "address",
            kind: types_1.FunctionInputKind.Replaceable,
        },
        {
            name: "_amount",
            type: "uint256",
            kind: types_1.FunctionInputKind.Count,
            value: asset.quantity,
        },
    ],
    target: asset.address,
    name: "transfer",
    outputs: [
        {
            name: "success",
            type: "bool",
            kind: types_1.FunctionOutputKind.Other,
        },
    ],
    payable: false,
    stateMutability: types_1.StateMutability.Nonpayable,
    type: Web3.AbiType.Function,
}); };
var SCHEMA_NAME_TO_ASSET_CONTRACT_TYPE = (_a = {},
    _a[types_2.WyvernSchemaName.ERC721] = types_2.AssetContractType.NonFungible,
    _a[types_2.WyvernSchemaName.ERC1155] = types_2.AssetContractType.SemiFungible,
    _a[types_2.WyvernSchemaName.ERC20] = types_2.AssetContractType.Fungible,
    _a[types_2.WyvernSchemaName.LegacyEnjin] = types_2.AssetContractType.SemiFungible,
    _a[types_2.WyvernSchemaName.ENSShortNameAuction] = types_2.AssetContractType.NonFungible,
    _a);
// OTHER
var txCallbacks = {};
/**
 * Promisify a callback-syntax web3 function
 * @param inner callback function that accepts a Web3 callback function and passes
 * it to the Web3 function
 */
function promisify(inner) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    return inner(function (err, res) {
                        if (err) {
                            reject(err);
                        }
                        resolve(res);
                    });
                })];
        });
    });
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
function promisifyCall(callback, onError) {
    return __awaiter(this, void 0, void 0, function () {
        var result, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, promisify(callback)];
                case 1:
                    result = _a.sent();
                    if (result == "0x") {
                        // Geth compatibility
                        return [2 /*return*/, undefined];
                    }
                    return [2 /*return*/, result];
                case 2:
                    error_1 = _a.sent();
                    // Probably method not found, and web3 is a Parity node
                    if (onError) {
                        onError(error_1);
                    }
                    else {
                        console.error(error_1);
                    }
                    return [2 /*return*/, undefined];
                case 3: return [2 /*return*/];
            }
        });
    });
}
exports.promisifyCall = promisifyCall;
var track = function (web3, txHash, onFinalized) {
    if (txCallbacks[txHash]) {
        txCallbacks[txHash].push(onFinalized);
    }
    else {
        txCallbacks[txHash] = [onFinalized];
        var poll_1 = function () { return __awaiter(_this, void 0, void 0, function () {
            var tx, receipt, status_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, promisify(function (c) {
                            return web3.eth.getTransaction(txHash, c);
                        })];
                    case 1:
                        tx = _a.sent();
                        if (!(tx && tx.blockHash && tx.blockHash !== constants_1.NULL_BLOCK_HASH)) return [3 /*break*/, 3];
                        return [4 /*yield*/, promisify(function (c) {
                                return web3.eth.getTransactionReceipt(txHash, c);
                            })];
                    case 2:
                        receipt = _a.sent();
                        if (!receipt) {
                            // Hack: assume success if no receipt
                            console.warn("No receipt found for ", txHash);
                        }
                        status_1 = receipt
                            ? parseInt((receipt.status || "0").toString()) == 1
                            : true;
                        txCallbacks[txHash].map(function (f) { return f(status_1); });
                        delete txCallbacks[txHash];
                        return [3 /*break*/, 4];
                    case 3:
                        setTimeout(poll_1, 1000);
                        _a.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        }); };
        poll_1().catch();
    }
};
exports.confirmTransaction = function (web3, txHash) { return __awaiter(_this, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, new Promise(function (resolve, reject) {
                track(web3, txHash, function (didSucceed) {
                    if (didSucceed) {
                        resolve("Transaction complete!");
                    }
                    else {
                        reject(new Error("Transaction failed :( You might have already completed this action. See more on the mainnet at etherscan.io/tx/" + txHash));
                    }
                });
            })];
    });
}); };
exports.assetFromJSON = function (asset) {
    var isAnimated = asset.image_url && asset.image_url.endsWith(".gif");
    var isSvg = asset.image_url && asset.image_url.endsWith(".svg");
    var fromJSON = {
        tokenId: asset.token_id.toString(),
        tokenAddress: asset.asset_contract.address,
        name: asset.name,
        description: asset.description,
        owner: asset.owner,
        assetContract: exports.assetContractFromJSON(asset.asset_contract),
        collection: exports.collectionFromJSON(asset.collection),
        orders: asset.orders ? asset.orders.map(exports.orderFromJSON) : null,
        sellOrders: asset.sell_orders ? asset.sell_orders.map(exports.orderFromJSON) : null,
        buyOrders: asset.buy_orders ? asset.buy_orders.map(exports.orderFromJSON) : null,
        isPresale: asset.is_presale,
        // Don't use previews if it's a special image
        imageUrl: isAnimated || isSvg
            ? asset.image_url
            : asset.image_preview_url || asset.image_url,
        imagePreviewUrl: asset.image_preview_url,
        imageUrlOriginal: asset.image_original_url,
        imageUrlThumbnail: asset.image_thumbnail_url,
        externalLink: asset.external_link,
        openseaLink: asset.permalink,
        traits: asset.traits,
        numSales: asset.num_sales,
        lastSale: asset.last_sale ? exports.assetEventFromJSON(asset.last_sale) : null,
        backgroundColor: asset.background_color
            ? "#" + asset.background_color
            : null,
        transferFee: asset.transfer_fee ? makeBigNumber(asset.transfer_fee) : null,
        transferFeePaymentToken: asset.transfer_fee_payment_token
            ? exports.tokenFromJSON(asset.transfer_fee_payment_token)
            : null,
    };
    // If orders were included, put them in sell/buy order groups
    if (fromJSON.orders && !fromJSON.sellOrders) {
        fromJSON.sellOrders = fromJSON.orders.filter(function (o) { return o.side == types_2.OrderSide.Sell; });
    }
    if (fromJSON.orders && !fromJSON.buyOrders) {
        fromJSON.buyOrders = fromJSON.orders.filter(function (o) { return o.side == types_2.OrderSide.Buy; });
    }
    return fromJSON;
};
exports.assetEventFromJSON = function (assetEvent) {
    return {
        eventType: assetEvent.event_type,
        eventTimestamp: assetEvent.event_timestamp,
        auctionType: assetEvent.auction_type,
        totalPrice: assetEvent.total_price,
        transaction: assetEvent.transaction
            ? exports.transactionFromJSON(assetEvent.transaction)
            : null,
        paymentToken: assetEvent.payment_token
            ? exports.tokenFromJSON(assetEvent.payment_token)
            : null,
    };
};
exports.transactionFromJSON = function (transaction) {
    return {
        fromAccount: exports.accountFromJSON(transaction.from_account),
        toAccount: exports.accountFromJSON(transaction.to_account),
        createdDate: new Date(transaction.created_date + "Z"),
        modifiedDate: new Date(transaction.modified_date + "Z"),
        transactionHash: transaction.transaction_hash,
        transactionIndex: transaction.transaction_index,
        blockNumber: transaction.block_number,
        blockHash: transaction.block_hash,
        timestamp: new Date(transaction.timestamp + "Z"),
    };
};
exports.accountFromJSON = function (account) {
    return {
        address: account.address,
        config: account.config,
        profileImgUrl: account.profile_img_url,
        user: account.user ? exports.userFromJSON(account.user) : null,
    };
};
exports.userFromJSON = function (user) {
    return {
        username: user.username,
    };
};
exports.assetBundleFromJSON = function (asset_bundle) {
    var fromJSON = {
        maker: asset_bundle.maker,
        assets: asset_bundle.assets.map(exports.assetFromJSON),
        assetContract: asset_bundle.asset_contract
            ? exports.assetContractFromJSON(asset_bundle.asset_contract)
            : undefined,
        name: asset_bundle.name,
        slug: asset_bundle.slug,
        description: asset_bundle.description,
        externalLink: asset_bundle.external_link,
        permalink: asset_bundle.permalink,
        sellOrders: asset_bundle.sell_orders
            ? asset_bundle.sell_orders.map(exports.orderFromJSON)
            : null,
    };
    return fromJSON;
};
exports.assetContractFromJSON = function (asset_contract) {
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
        openseaSellerFeeBasisPoints: +asset_contract.opensea_seller_fee_basis_points,
        devBuyerFeeBasisPoints: +asset_contract.dev_buyer_fee_basis_points,
        devSellerFeeBasisPoints: +asset_contract.dev_seller_fee_basis_points,
        imageUrl: asset_contract.image_url,
        externalLink: asset_contract.external_link,
        wikiLink: asset_contract.wiki_link,
    };
};
exports.collectionFromJSON = function (collection) {
    var createdDate = new Date(collection.created_date + "Z");
    return {
        createdDate: createdDate,
        name: collection.name,
        description: collection.description,
        slug: collection.slug,
        editors: collection.editors,
        hidden: collection.hidden,
        featured: collection.featured,
        featuredImageUrl: collection.featured_image_url,
        displayData: collection.display_data,
        paymentTokens: (collection.payment_tokens || []).map(exports.tokenFromJSON),
        openseaBuyerFeeBasisPoints: +collection.opensea_buyer_fee_basis_points,
        openseaSellerFeeBasisPoints: +collection.opensea_seller_fee_basis_points,
        devBuyerFeeBasisPoints: +collection.dev_buyer_fee_basis_points,
        devSellerFeeBasisPoints: +collection.dev_seller_fee_basis_points,
        payoutAddress: collection.payout_address,
        imageUrl: collection.image_url,
        largeImageUrl: collection.large_image_url,
        stats: collection.stats,
        traitStats: collection.traits,
        externalLink: collection.external_url,
        wikiLink: collection.wiki_url,
    };
};
exports.tokenFromJSON = function (token) {
    var fromJSON = {
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
exports.orderFromJSON = function (order) {
    var createdDate = new Date(order.created_date + "Z");
    var fromJSON = {
        hash: order.order_hash || order.hash,
        cancelledOrFinalized: order.cancelled || order.finalized,
        markedInvalid: order.marked_invalid,
        metadata: order.metadata,
        quantity: new bignumber_js_1.default(order.quantity || 1),
        exchange: order.exchange,
        makerAccount: order.maker,
        takerAccount: order.taker,
        // Use string address to conform to Wyvern Order schema
        maker: order.maker.address,
        taker: order.taker.address,
        makerRelayerFee: new bignumber_js_1.default(order.maker_relayer_fee),
        takerRelayerFee: new bignumber_js_1.default(order.taker_relayer_fee),
        makerProtocolFee: new bignumber_js_1.default(order.maker_protocol_fee),
        takerProtocolFee: new bignumber_js_1.default(order.taker_protocol_fee),
        makerReferrerFee: new bignumber_js_1.default(order.maker_referrer_fee || 0),
        waitingForBestCounterOrder: order.fee_recipient.address == constants_1.NULL_ADDRESS,
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
        basePrice: new bignumber_js_1.default(order.base_price),
        extra: new bignumber_js_1.default(order.extra),
        currentBounty: new bignumber_js_1.default(order.current_bounty || 0),
        currentPrice: new bignumber_js_1.default(order.current_price || 0),
        createdTime: new bignumber_js_1.default(Math.round(createdDate.getTime() / 1000)),
        listingTime: new bignumber_js_1.default(order.listing_time),
        expirationTime: new bignumber_js_1.default(order.expiration_time),
        salt: new bignumber_js_1.default(order.salt),
        v: parseInt(order.v),
        r: order.r,
        s: order.s,
        paymentTokenContract: order.payment_token_contract
            ? exports.tokenFromJSON(order.payment_token_contract)
            : undefined,
        asset: order.asset ? exports.assetFromJSON(order.asset) : undefined,
        assetBundle: order.asset_bundle
            ? exports.assetBundleFromJSON(order.asset_bundle)
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
exports.orderToJSON = function (order) {
    var asJSON = {
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
function personalSignAsync(web3, message, signerAddress) {
    return __awaiter(this, void 0, void 0, function () {
        var signature, error;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, promisify(function (c) {
                        return web3.currentProvider.sendAsync({
                            method: "personal_sign",
                            params: [message, signerAddress],
                            from: signerAddress,
                            id: new Date().getTime(),
                        }, c);
                    })];
                case 1:
                    signature = _a.sent();
                    error = signature.error;
                    if (error) {
                        throw new Error(error);
                    }
                    //
                    return [2 /*return*/, __assign({}, parseSignatureHex(signature.result))];
            }
        });
    });
}
exports.personalSignAsync = personalSignAsync;
/**
 * Checks whether a given address contains any code
 * @param web3 Web3 instance
 * @param address input address
 */
function isContractAddress(web3, address) {
    return __awaiter(this, void 0, void 0, function () {
        var code;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, promisify(function (c) { return web3.eth.getCode(address, c); })];
                case 1:
                    code = _a.sent();
                    return [2 /*return*/, code !== "0x"];
            }
        });
    });
}
exports.isContractAddress = isContractAddress;
/**
 * Special fixes for making BigNumbers using web3 results
 * @param arg An arg or the result of a web3 call to turn into a BigNumber
 */
function makeBigNumber(arg) {
    // Zero sometimes returned as 0x from contracts
    if (arg === "0x") {
        arg = 0;
    }
    // fix "new BigNumber() number type has more than 15 significant digits"
    arg = arg.toString();
    return new bignumber_js_1.default(arg);
}
exports.makeBigNumber = makeBigNumber;
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
function sendRawTransaction(web3, _a, onError) {
    var from = _a.from, to = _a.to, data = _a.data, gasPrice = _a.gasPrice, _b = _a.value, value = _b === void 0 ? 0 : _b, gas = _a.gas;
    return __awaiter(this, void 0, void 0, function () {
        var txHashRes, error_2;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!(gas == null)) return [3 /*break*/, 2];
                    return [4 /*yield*/, estimateGas(web3, { from: from, to: to, data: data, value: value })];
                case 1:
                    // This gas cannot be increased due to an ethjs error
                    gas = _c.sent();
                    _c.label = 2;
                case 2:
                    _c.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, promisify(function (c) {
                            return web3.eth.sendTransaction({
                                from: from,
                                to: to,
                                value: value,
                                data: data,
                                gas: gas,
                                gasPrice: gasPrice,
                            }, c);
                        })];
                case 3:
                    txHashRes = _c.sent();
                    return [2 /*return*/, txHashRes.toString()];
                case 4:
                    error_2 = _c.sent();
                    onError(error_2);
                    throw error_2;
                case 5: return [2 /*return*/];
            }
        });
    });
}
exports.sendRawTransaction = sendRawTransaction;
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
function rawCall(web3, _a, onError) {
    var from = _a.from, to = _a.to, data = _a.data;
    return __awaiter(this, void 0, void 0, function () {
        var result, error_3;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, promisify(function (c) {
                            return web3.eth.call({
                                from: from,
                                to: to,
                                data: data,
                            }, c);
                        })];
                case 1:
                    result = _b.sent();
                    return [2 /*return*/, result];
                case 2:
                    error_3 = _b.sent();
                    // Probably method not found, and web3 is a Parity node
                    if (onError) {
                        onError(error_3);
                    }
                    // Backwards compatibility with Geth nodes
                    return [2 /*return*/, "0x"];
                case 3: return [2 /*return*/];
            }
        });
    });
}
exports.rawCall = rawCall;
/**
 * Estimate Gas usage for a transaction
 * @param web3 Web3 instance
 * @param from address sending transaction
 * @param to destination contract address
 * @param data data to send to contract
 * @param value value in ETH to send with data
 */
function estimateGas(web3, _a) {
    var from = _a.from, to = _a.to, data = _a.data, _b = _a.value, value = _b === void 0 ? 0 : _b;
    return __awaiter(this, void 0, void 0, function () {
        var amount;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, promisify(function (c) {
                        return web3.eth.estimateGas({
                            from: from,
                            to: to,
                            value: value,
                            data: data,
                        }, c);
                    })];
                case 1:
                    amount = _c.sent();
                    return [2 /*return*/, amount];
            }
        });
    });
}
exports.estimateGas = estimateGas;
/**
 * Get mean gas price for sending a txn, in wei
 * @param web3 Web3 instance
 */
function getCurrentGasPrice(web3) {
    return __awaiter(this, void 0, void 0, function () {
        var meanGas;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, promisify(function (c) { return web3.eth.getGasPrice(c); })];
                case 1:
                    meanGas = _a.sent();
                    return [2 /*return*/, meanGas];
            }
        });
    });
}
exports.getCurrentGasPrice = getCurrentGasPrice;
/**
 * Get current transfer fees for an asset
 * @param web3 Web3 instance
 * @param asset The asset to check for transfer fees
 */
function getTransferFeeSettings(web3, _a) {
    var asset = _a.asset, accountAddress = _a.accountAddress;
    return __awaiter(this, void 0, void 0, function () {
        var transferFee, transferFeeTokenAddress, feeContract_1, params;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!(asset.tokenAddress.toLowerCase() == constants_1.ENJIN_ADDRESS.toLowerCase())) return [3 /*break*/, 2];
                    feeContract_1 = web3.eth
                        .contract(contracts_1.ERC1155)
                        .at(asset.tokenAddress);
                    return [4 /*yield*/, promisifyCall(function (c) {
                            return feeContract_1.transferSettings(asset.tokenId, { from: accountAddress }, c);
                        })];
                case 1:
                    params = _b.sent();
                    if (params) {
                        transferFee = makeBigNumber(params[3]);
                        if (params[2] == 0) {
                            transferFeeTokenAddress = constants_1.ENJIN_COIN_ADDRESS;
                        }
                    }
                    _b.label = 2;
                case 2: return [2 /*return*/, { transferFee: transferFee, transferFeeTokenAddress: transferFeeTokenAddress }];
            }
        });
    });
}
exports.getTransferFeeSettings = getTransferFeeSettings;
// sourced from 0x.js:
// https://github.com/ProjectWyvern/wyvern-js/blob/39999cb93ce5d80ea90b4382182d1bd4339a9c6c/src/utils/signature_utils.ts
function parseSignatureHex(signature) {
    // HACK: There is no consensus on whether the signatureHex string should be formatted as
    // v + r + s OR r + s + v, and different clients (even different versions of the same client)
    // return the signature params in different orders. In order to support all client implementations,
    // we parse the signature in both ways, and evaluate if either one is a valid signature.
    var validVParamValues = [27, 28];
    var ecSignatureRSV = _parseSignatureHexAsRSV(signature);
    if (_.includes(validVParamValues, ecSignatureRSV.v)) {
        return ecSignatureRSV;
    }
    // For older clients
    var ecSignatureVRS = _parseSignatureHexAsVRS(signature);
    if (_.includes(validVParamValues, ecSignatureVRS.v)) {
        return ecSignatureVRS;
    }
    throw new Error("Invalid signature");
    function _parseSignatureHexAsVRS(signatureHex) {
        var signatureBuffer = ethUtil.toBuffer(signatureHex);
        var v = signatureBuffer[0];
        if (v < 27) {
            v += 27;
        }
        var r = signatureBuffer.slice(1, 33);
        var s = signatureBuffer.slice(33, 65);
        var ecSignature = {
            v: v,
            r: ethUtil.bufferToHex(r),
            s: ethUtil.bufferToHex(s),
        };
        return ecSignature;
    }
    function _parseSignatureHexAsRSV(signatureHex) {
        var _a = ethUtil.fromRpcSig(signatureHex), v = _a.v, r = _a.r, s = _a.s;
        var ecSignature = {
            v: v,
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
function estimateCurrentPrice(order, secondsToBacktrack, shouldRoundUp) {
    if (secondsToBacktrack === void 0) { secondsToBacktrack = 30; }
    if (shouldRoundUp === void 0) { shouldRoundUp = true; }
    var basePrice = order.basePrice, listingTime = order.listingTime, expirationTime = order.expirationTime, extra = order.extra;
    var side = order.side, takerRelayerFee = order.takerRelayerFee, saleKind = order.saleKind;
    var now = new bignumber_js_1.default(Math.round(Date.now() / 1000)).minus(secondsToBacktrack);
    basePrice = new bignumber_js_1.default(basePrice);
    listingTime = new bignumber_js_1.default(listingTime);
    expirationTime = new bignumber_js_1.default(expirationTime);
    extra = new bignumber_js_1.default(extra);
    var exactPrice = basePrice;
    if (saleKind === types_2.SaleKind.FixedPrice) {
        // Do nothing, price is correct
    }
    else if (saleKind === types_2.SaleKind.DutchAuction) {
        var diff = extra
            .times(now.minus(listingTime))
            .dividedBy(expirationTime.minus(listingTime));
        exactPrice =
            side == types_2.OrderSide.Sell
                ? /* Sell-side - start price: basePrice. End price: basePrice - extra. */
                    basePrice.minus(diff)
                : /* Buy-side - start price: basePrice. End price: basePrice + extra. */
                    basePrice.plus(diff);
    }
    // Add taker fee only for buyers
    if (side === types_2.OrderSide.Sell && !order.waitingForBestCounterOrder) {
        // Buyer fee increases sale price
        exactPrice = exactPrice.times(+takerRelayerFee / constants_1.INVERSE_BASIS_POINT + 1);
    }
    return shouldRoundUp ? exactPrice.ceil() : exactPrice;
}
exports.estimateCurrentPrice = estimateCurrentPrice;
/**
 * Get the Wyvern representation of a fungible asset
 * @param schema The WyvernSchema needed to access this asset
 * @param asset The asset to trade
 * @param quantity The number of items to trade
 */
function getWyvernAsset(schema, asset, quantity) {
    if (quantity === void 0) { quantity = new bignumber_js_1.default(1); }
    var tokenId = asset.tokenId != null ? asset.tokenId.toString() : undefined;
    return schema.assetFromFields({
        ID: tokenId,
        Quantity: quantity.toString(),
        Address: asset.tokenAddress.toLowerCase(),
        Name: asset.name,
    });
}
exports.getWyvernAsset = getWyvernAsset;
/**
 * Get the Wyvern representation of a group of assets
 * Sort order is enforced here. Throws if there's a duplicate.
 * @param assets Assets to bundle
 * @param schemas The WyvernSchemas needed to access each asset, respectively
 * @param quantities The quantity of each asset to bundle, respectively
 */
function getWyvernBundle(assets, schemas, quantities) {
    if (assets.length != quantities.length) {
        throw new Error("Bundle must have a quantity for every asset");
    }
    if (assets.length != schemas.length) {
        throw new Error("Bundle must have a schema for every asset");
    }
    var wyAssets = assets.map(function (asset, i) {
        return getWyvernAsset(schemas[i], asset, quantities[i]);
    });
    var sorters = [
        function (assetAndSchema) {
            return assetAndSchema.asset.address;
        },
        function (assetAndSchema) {
            return assetAndSchema.asset.id || 0;
        },
    ];
    var wyAssetsAndSchemas = wyAssets.map(function (asset, i) { return ({
        asset: asset,
        schema: schemas[i].name,
    }); });
    var uniqueAssets = _.uniqBy(wyAssetsAndSchemas, function (group) { return sorters[0](group) + "-" + sorters[1](group); });
    if (uniqueAssets.length != wyAssetsAndSchemas.length) {
        throw new Error("Bundle can't contain duplicate assets");
    }
    var sortedWyAssetsAndSchemas = _.sortBy(wyAssetsAndSchemas, sorters);
    return {
        assets: sortedWyAssetsAndSchemas.map(function (group) { return group.asset; }),
        schemas: sortedWyAssetsAndSchemas.map(function (group) { return group.schema; }),
    };
}
exports.getWyvernBundle = getWyvernBundle;
/**
 * Get the non-prefixed hash for the order
 * (Fixes a Wyvern typescript issue and casing issue)
 * @param order order to hash
 */
function getOrderHash(order) {
    var orderWithStringTypes = __assign({}, order, { maker: order.maker.toLowerCase(), taker: order.taker.toLowerCase(), feeRecipient: order.feeRecipient.toLowerCase(), side: order.side.toString(), saleKind: order.saleKind.toString(), howToCall: order.howToCall.toString(), feeMethod: order.feeMethod.toString() });
    // console.log("orderWithStringTypes", orderWithStringTypes);
    return wyvern_js_1.WyvernProtocol.getOrderHashHex(orderWithStringTypes);
}
exports.getOrderHash = getOrderHash;
/**
 * Assign an order and a new matching order to their buy/sell sides
 * @param order Original order
 * @param matchingOrder The result of _makeMatchingOrder
 */
function assignOrdersToSides(order, matchingOrder) {
    var isSellOrder = order.side == types_2.OrderSide.Sell;
    var buy;
    var sell;
    if (!isSellOrder) {
        buy = order;
        sell = __assign({}, matchingOrder, { v: buy.v, r: buy.r, s: buy.s });
    }
    else {
        sell = order;
        buy = __assign({}, matchingOrder, { v: sell.v, r: sell.r, s: sell.s });
    }
    return { buy: buy, sell: sell };
}
exports.assignOrdersToSides = assignOrdersToSides;
// BROKEN
// TODO fix this calldata for buy orders
function canSettleOrder(client, order, matchingOrder) {
    return __awaiter(this, void 0, void 0, function () {
        var calldata, seller, proxy, contract;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    calldata = order.calldata.slice(0, 98) +
                        "1111111111111111111111111111111111111111" +
                        order.calldata.slice(138);
                    seller = order.side == types_2.OrderSide.Buy ? matchingOrder.maker : order.maker;
                    return [4 /*yield*/, client._getProxy(seller)];
                case 1:
                    proxy = _a.sent();
                    if (!proxy) {
                        console.warn("No proxy found for seller " + seller);
                        return [2 /*return*/, false];
                    }
                    contract = client.web3.eth.contract([Proxy_1.proxyABI]).at(proxy);
                    return [2 /*return*/, promisify(function (c) {
                            return contract.proxy.call(order.target, order.howToCall, calldata, { from: seller }, c);
                        })];
            }
        });
    });
}
/**
 * Delay using setTimeout
 * @param ms milliseconds to wait
 */
function delay(ms) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (res) { return setTimeout(res, ms); })];
        });
    });
}
exports.delay = delay;
/**
 * Validates that an address exists, isn't null, and is properly
 * formatted for Wyvern and OpenSea
 * @param address input address
 */
function validateAndFormatWalletAddress(web3, address) {
    if (!address) {
        throw new Error("No wallet address found");
    }
    if (!web3.isAddress(address)) {
        throw new Error("Invalid wallet address");
    }
    if (address == constants_1.NULL_ADDRESS) {
        throw new Error("Wallet cannot be the null address");
    }
    return address.toLowerCase();
}
exports.validateAndFormatWalletAddress = validateAndFormatWalletAddress;
/**
 * Notify developer when a pattern will be deprecated
 * @param msg message to log to console
 */
function onDeprecated(msg) {
    console.warn("DEPRECATION NOTICE: " + msg);
}
exports.onDeprecated = onDeprecated;
/**
 * Get special-case approval addresses for an erc721 contract
 * @param erc721Contract contract to check
 */
function getNonCompliantApprovalAddress(erc721Contract, tokenId, accountAddress) {
    return __awaiter(this, void 0, void 0, function () {
        var results;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, Promise.all([
                        // CRYPTOKITTIES check
                        promisifyCall(function (c) {
                            return erc721Contract.kittyIndexToApproved.call(tokenId, c);
                        }),
                        // Etherbots check
                        promisifyCall(function (c) {
                            return erc721Contract.partIndexToApproved.call(tokenId, c);
                        }),
                    ])];
                case 1:
                    results = _a.sent();
                    return [2 /*return*/, _.compact(results)[0]];
            }
        });
    });
}
exports.getNonCompliantApprovalAddress = getNonCompliantApprovalAddress;
function createFakeAsset(_a) {
    var tokenId = _a.tokenId, tokenAddress = _a.tokenAddress, _b = _a.schemaName, schemaName = _b === void 0 ? "ERC1155" : _b;
    if (schemaName === "ERC721") {
        return {
            id: tokenId,
            token_id: tokenId,
            num_sales: 0,
            background_color: null,
            image_url: "https://storage.googleapis.com/ck-kitty-image/0x06012c8cf97bead5deae237070f9587f8e7a266d/0.svg",
            image_preview_url: "https://storage.googleapis.com/ck-kitty-image/0x06012c8cf97bead5deae237070f9587f8e7a266d/0.svg",
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
                description: "CryptoKitties is a game centered around breedable, collectible, and oh-so-adorable creatures we call CryptoKitties! Each cat is one-of-a-kind and 100% owned by you; it cannot be replicated, taken away, or destroyed.",
                external_link: "https://www.cryptokitties.co/",
                image_url: "https://lh3.googleusercontent.com/C272ZRW1RGGef9vKMePFSCeKc1Lw6U40wl9ofNVxzUxFdj84hH9xJRQNf-7wgs7W8qw8RWe-1ybKp-VKuU5D-tg=s60",
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
            permalink: "https://opensea.io/assets/0x06012c8cf97bead5deae237070f9587f8e7a266d/0",
            collection: {
                payment_tokens: [
                    {
                        id: 5098533,
                        symbol: "RFR",
                        address: "0xd0929d411954c47438dc1d871dd6081f5c5e149c",
                        image_url: "https://lh3.googleusercontent.com/XB1KohVuy2E87R324IGijVhDZeHKhlkiB_TcpAH8sVTCdaA5brsYyxYXNzFK6SE2qGAtfya7FVzB9rgJBYQrjJVqeA",
                        name: null,
                        decimals: 4,
                        eth_price: 1.078455134e-5,
                        usd_price: 0.02168627,
                    },
                    {
                        id: 13689077,
                        symbol: "ETH",
                        address: "0x0000000000000000000000000000000000000000",
                        image_url: "https://storage.opensea.io/files/6f8e2979d428180222796ff4a33ab929.svg",
                        name: "Ether",
                        decimals: 18,
                        eth_price: 1.0,
                        usd_price: 4308.2,
                    },
                    {
                        id: 4645815,
                        symbol: "GUSD",
                        address: "0x056fd409e1d7a124bd7017459dfea2f387b6d5cd",
                        image_url: "https://lh3.googleusercontent.com/MLKbcx1oxhZjkXzsQM-fju8R3hHqsu-mGpFzivWMadH7bXT_kw48-rrD6os594lPY0x7MU-QGLy4ZudX1ePTx-Y",
                        name: "Gemini dollar",
                        decimals: 2,
                        eth_price: 0.00056390042182,
                        usd_price: 1.0,
                    },
                    {
                        id: 12182941,
                        symbol: "DAI",
                        address: "0x6b175474e89094c44da98b954eedeac495271d0f",
                        image_url: "https://storage.opensea.io/files/8ef8fb3fe707f693e57cdbfea130c24c.svg",
                        name: "Dai Stablecoin",
                        decimals: 18,
                        eth_price: 0.00023278,
                        usd_price: 1.0,
                    },
                    {
                        id: 4645681,
                        symbol: "WETH",
                        address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
                        image_url: "https://storage.opensea.io/files/accae6b6fb3888cbff27a013729c22dc.svg",
                        name: "Wrapped Ether",
                        decimals: 18,
                        eth_price: 1.0,
                        usd_price: 4308.2,
                    },
                    {
                        id: 4403908,
                        symbol: "USDC",
                        address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
                        image_url: "https://storage.opensea.io/files/749015f009a66abcb3bbb3502ae2f1ce.svg",
                        name: "USD Coin",
                        decimals: 6,
                        eth_price: 0.00023293,
                        usd_price: 1.0,
                    },
                    {
                        id: 4645691,
                        symbol: "WCK",
                        address: "0x09fe5f0236f0ea5d930197dce254d77b04128075",
                        image_url: "https://lh3.googleusercontent.com/L5nvau4G9vXrA4AUs8OLxddBBEQHQZgUuUqnv9PzGo5mMgDm3_7pKhy8HPeWnqYCqKBi3MkhY6vpzq0HnV4aAEY",
                        name: "Wrapped CryptoKitties",
                        decimals: 18,
                        eth_price: 0.003858847984609,
                        usd_price: 7.84,
                    },
                    {
                        id: 16206959,
                        symbol: "CHERRY",
                        address: "0x0eed7d6564fae0c22a7dc9ebb3db4a4c4a1473ee",
                        image_url: "https://lh3.googleusercontent.com/DRoQ7e9zCHgk8CLcTpKxYTIIFyG8qzlsW3wPFY_NiVVdScylei8jbXHua49Bp--j7tNIvTYxftIwpEuatgUxsN8AeA",
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
                        description: "CryptoKitties is a game centered around breedable, collectible, and oh-so-adorable creatures we call CryptoKitties! Each cat is one-of-a-kind and 100% owned by you; it cannot be replicated, taken away, or destroyed.",
                        external_link: "https://www.cryptokitties.co/",
                        image_url: "https://lh3.googleusercontent.com/C272ZRW1RGGef9vKMePFSCeKc1Lw6U40wl9ofNVxzUxFdj84hH9xJRQNf-7wgs7W8qw8RWe-1ybKp-VKuU5D-tg=s60",
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
                banner_image_url: "https://storage.opensea.io/static/banners/cryptokitties-banner2.png",
                chat_url: null,
                created_date: "2019-04-26T22:13:04.207050",
                default_to_fiat: false,
                description: "CryptoKitties is a game centered around breedable, collectible, and oh-so-adorable creatures we call CryptoKitties! Each cat is one-of-a-kind and 100% owned by you; it cannot be replicated, taken away, or destroyed.",
                dev_buyer_fee_basis_points: "0",
                dev_seller_fee_basis_points: "0",
                discord_url: "https://discord.gg/cryptokitties",
                display_data: {
                    card_display_style: "padded",
                },
                external_url: "https://www.cryptokitties.co/",
                featured: false,
                featured_image_url: "https://storage.opensea.io/0x06012c8cf97bead5deae237070f9587f8e7a266d-featured-1556589429.png",
                hidden: false,
                safelist_request_status: "verified",
                image_url: "https://lh3.googleusercontent.com/C272ZRW1RGGef9vKMePFSCeKc1Lw6U40wl9ofNVxzUxFdj84hH9xJRQNf-7wgs7W8qw8RWe-1ybKp-VKuU5D-tg=s60",
                is_subject_to_whitelist: false,
                large_image_url: "https://lh3.googleusercontent.com/C272ZRW1RGGef9vKMePFSCeKc1Lw6U40wl9ofNVxzUxFdj84hH9xJRQNf-7wgs7W8qw8RWe-1ybKp-VKuU5D-tg",
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
                profile_img_url: "https://storage.googleapis.com/opensea-static/opensea-profile/1.png",
                address: "0x0000000000000000000000000000000000000000",
                config: "",
            },
            sell_orders: null,
            creator: {
                user: null,
                profile_img_url: "https://storage.googleapis.com/opensea-static/opensea-profile/3.png",
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
                    order_hash: "0x98ef717da657603cd90733a3e1036622c823e6bd82842d8245fbf6582cf19df2",
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
                        profile_img_url: "https://storage.googleapis.com/opensea-static/opensea-profile/33.png",
                        address: "0x4884b3a2c3d7fad7627fad543abf0c9e2148edf9",
                        config: "affiliate",
                    },
                    taker: {
                        user: {
                            username: "NullAddress",
                        },
                        profile_img_url: "https://storage.googleapis.com/opensea-static/opensea-profile/1.png",
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
                        profile_img_url: "https://storage.googleapis.com/opensea-static/opensea-profile/28.png",
                        address: "0x5b3256965e7c3cf26e11fcaf296dfc8807c01073",
                        config: "verified",
                    },
                    fee_method: 1,
                    side: 0,
                    sale_kind: 0,
                    target: "0x06012c8cf97bead5deae237070f9587f8e7a266d",
                    how_to_call: 0,
                    calldata: "0x23b872dd00000000000000000000000000000000000000000000000000000000000000000000000000000000000000004884b3a2c3d7fad7627fad543abf0c9e2148edf90000000000000000000000000000000000000000000000000000000000000000",
                    replacement_pattern: "0x00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
                    static_target: "0x0000000000000000000000000000000000000000",
                    static_extradata: "0x",
                    payment_token: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
                    payment_token_contract: {
                        id: 2,
                        symbol: "WETH",
                        address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
                        image_url: "https://storage.opensea.io/files/accae6b6fb3888cbff27a013729c22dc.svg",
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
                    prefixed_hash: "0x1256af3c58e805e2c934c1ddcc61b30384057624ff3ae134a97fa0440e9ab2a8",
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
                        profile_img_url: "https://storage.googleapis.com/opensea-static/opensea-profile/1.png",
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
        image_url: "https://lh3.googleusercontent.com/bv54wFuLUjQ4z4MQHmEm-TGSVhULh3ccctx3vAtxao7wleO1HV6nxwvrJrZxGNPwLzBA_3nrfY88r37H0zvnTioGbo5yZb_eHuLmJA",
        image_preview_url: "https://lh3.googleusercontent.com/bv54wFuLUjQ4z4MQHmEm-TGSVhULh3ccctx3vAtxao7wleO1HV6nxwvrJrZxGNPwLzBA_3nrfY88r37H0zvnTioGbo5yZb_eHuLmJA=s250",
        image_thumbnail_url: "https://lh3.googleusercontent.com/bv54wFuLUjQ4z4MQHmEm-TGSVhULh3ccctx3vAtxao7wleO1HV6nxwvrJrZxGNPwLzBA_3nrfY88r37H0zvnTioGbo5yZb_eHuLmJA=s128",
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
        permalink: "https://testnets.opensea.io/assets/0x88b48f654c30e99bc2e4a1559b4dcf1ad93fa656/72506337805396774008870872080979638262350033986330700370714622750499255877633",
        collection: {
            payment_tokens: [
                {
                    id: 382494,
                    symbol: "BNB",
                    address: "0x0000000000000000000000000000000000000000",
                    image_url: "https://storage.opensea.io/files/6f8e2979d428180222796ff4a33ab929.svg",
                    name: null,
                    decimals: 18,
                    eth_price: 1,
                    usd_price: 305.65,
                },
                {
                    id: 180476,
                    symbol: "WETH",
                    address: "0xc778417e063141139fce010982780140aa0cd5ab",
                    image_url: "https://storage.opensea.io/files/accae6b6fb3888cbff27a013729c22dc.svg",
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
            image_url: "https://lh3.googleusercontent.com/140EDkVeUhvKAhnVR_4YayDl4lmdDNqvOpUoicFAoNEcUc4Noe7DAOdHLHs7Iwd95RDLeM2_uKeV1CXZC4uFuMEpe5J4W-3Ec3rA1Q=s120",
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
            profile_img_url: "https://storage.googleapis.com/opensea-static/opensea-profile/1.png",
            address: "0x0000000000000000000000000000000000000000",
            config: "",
            discord_id: "",
        },
        sell_orders: null,
        creator: {
            user: {
                username: null,
            },
            profile_img_url: "https://storage.googleapis.com/opensea-static/opensea-profile/10.png",
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
                    profile_img_url: "https://storage.googleapis.com/opensea-static/opensea-profile/10.png",
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
exports.createFakeAsset = createFakeAsset;
//# sourceMappingURL=utils.js.map