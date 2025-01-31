import BigNumber from "bignumber.js";
import { WyvernProtocol } from "wyvern-js";
import * as Web3 from "web3";
import { AnnotatedFunctionABI, Schema } from "wyvern-schemas/dist/types";
import { Asset, AssetEvent, ECSignature, OpenSeaAccount, OpenSeaAsset, OpenSeaAssetBundle, OpenSeaAssetContract, OpenSeaCollection, OpenSeaFungibleToken, OpenSeaUser, Order, OrderJSON, Transaction, UnhashedOrder, UnsignedOrder, Web3Callback, WyvernAsset, WyvernBundle, WyvernFTAsset, WyvernNFTAsset } from "../types";
export { WyvernProtocol };
export declare const annotateERC721TransferABI: (asset: WyvernNFTAsset) => AnnotatedFunctionABI;
export declare const annotateERC20TransferABI: (asset: WyvernFTAsset) => AnnotatedFunctionABI;
/**
 * Promisify a call a method on a contract,
 * handling Parity errors. Returns '0x' if error.
 * Note that if T is not "string", this may return a falsey
 * value when the contract doesn't support the method (e.g. `isApprovedForAll`).
 * @param callback An anonymous function that takes a web3 callback
 * and returns a Web3 Contract's call result, e.g. `c => erc721.ownerOf(3, c)`
 * @param onError callback when user denies transaction
 */
export declare function promisifyCall<T>(callback: (fn: Web3Callback<T>) => void, onError?: (error: Error) => void): Promise<T | undefined>;
export declare const confirmTransaction: (web3: Web3, txHash: string) => Promise<{}>;
export declare const assetFromJSON: (asset: any) => OpenSeaAsset;
export declare const assetEventFromJSON: (assetEvent: any) => AssetEvent;
export declare const transactionFromJSON: (transaction: any) => Transaction;
export declare const accountFromJSON: (account: any) => OpenSeaAccount;
export declare const userFromJSON: (user: any) => OpenSeaUser;
export declare const assetBundleFromJSON: (asset_bundle: any) => OpenSeaAssetBundle;
export declare const assetContractFromJSON: (asset_contract: any) => OpenSeaAssetContract;
export declare const collectionFromJSON: (collection: any) => OpenSeaCollection;
export declare const tokenFromJSON: (token: any) => OpenSeaFungibleToken;
export declare const orderFromJSON: (order: any) => Order;
/**
 * Convert an order to JSON, hashing it as well if necessary
 * @param order order (hashed or unhashed)
 */
export declare const orderToJSON: (order: Order) => OrderJSON;
/**
 * Sign messages using web3 personal signatures
 * @param web3 Web3 instance
 * @param message message to sign
 * @param signerAddress web3 address signing the message
 * @returns A signature if provider can sign, otherwise null
 */
export declare function personalSignAsync(web3: Web3, message: string, signerAddress: string): Promise<ECSignature>;
/**
 * Checks whether a given address contains any code
 * @param web3 Web3 instance
 * @param address input address
 */
export declare function isContractAddress(web3: Web3, address: string): Promise<boolean>;
/**
 * Special fixes for making BigNumbers using web3 results
 * @param arg An arg or the result of a web3 call to turn into a BigNumber
 */
export declare function makeBigNumber(arg: number | string | BigNumber): BigNumber;
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
export declare function sendRawTransaction(web3: Web3, { from, to, data, gasPrice, value, gas }: Web3.TxData, onError: (error: Error) => void): Promise<string>;
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
export declare function rawCall(web3: Web3, { from, to, data }: Web3.CallData, onError?: (error: Error) => void): Promise<string>;
/**
 * Estimate Gas usage for a transaction
 * @param web3 Web3 instance
 * @param from address sending transaction
 * @param to destination contract address
 * @param data data to send to contract
 * @param value value in ETH to send with data
 */
export declare function estimateGas(web3: Web3, { from, to, data, value }: Web3.TxData): Promise<number>;
/**
 * Get mean gas price for sending a txn, in wei
 * @param web3 Web3 instance
 */
export declare function getCurrentGasPrice(web3: Web3): Promise<BigNumber>;
/**
 * Get current transfer fees for an asset
 * @param web3 Web3 instance
 * @param asset The asset to check for transfer fees
 */
export declare function getTransferFeeSettings(web3: Web3, { asset, accountAddress, }: {
    asset: Asset;
    accountAddress?: string;
}): Promise<{
    transferFee: BigNumber | undefined;
    transferFeeTokenAddress: string | undefined;
}>;
/**
 * Estimates the price of an order
 * @param order The order to estimate price on
 * @param secondsToBacktrack The number of seconds to subtract on current time,
 *  to fix race conditions
 * @param shouldRoundUp Whether to round up fractional wei
 */
export declare function estimateCurrentPrice(order: Order, secondsToBacktrack?: number, shouldRoundUp?: boolean): BigNumber;
/**
 * Get the Wyvern representation of a fungible asset
 * @param schema The WyvernSchema needed to access this asset
 * @param asset The asset to trade
 * @param quantity The number of items to trade
 */
export declare function getWyvernAsset(schema: Schema<WyvernAsset>, asset: Asset, quantity?: BigNumber): WyvernAsset;
/**
 * Get the Wyvern representation of a group of assets
 * Sort order is enforced here. Throws if there's a duplicate.
 * @param assets Assets to bundle
 * @param schemas The WyvernSchemas needed to access each asset, respectively
 * @param quantities The quantity of each asset to bundle, respectively
 */
export declare function getWyvernBundle(assets: Asset[], schemas: Array<Schema<WyvernAsset>>, quantities: BigNumber[]): WyvernBundle;
/**
 * Get the non-prefixed hash for the order
 * (Fixes a Wyvern typescript issue and casing issue)
 * @param order order to hash
 */
export declare function getOrderHash(order: UnhashedOrder): string;
/**
 * Assign an order and a new matching order to their buy/sell sides
 * @param order Original order
 * @param matchingOrder The result of _makeMatchingOrder
 */
export declare function assignOrdersToSides(order: Order, matchingOrder: UnsignedOrder): {
    buy: Order;
    sell: Order;
};
/**
 * Delay using setTimeout
 * @param ms milliseconds to wait
 */
export declare function delay(ms: number): Promise<{}>;
/**
 * Validates that an address exists, isn't null, and is properly
 * formatted for Wyvern and OpenSea
 * @param address input address
 */
export declare function validateAndFormatWalletAddress(web3: Web3, address: string): string;
/**
 * Notify developer when a pattern will be deprecated
 * @param msg message to log to console
 */
export declare function onDeprecated(msg: string): void;
/**
 * Get special-case approval addresses for an erc721 contract
 * @param erc721Contract contract to check
 */
export declare function getNonCompliantApprovalAddress(erc721Contract: Web3.ContractInstance, tokenId: string, accountAddress: string): Promise<string | undefined>;
export declare function createFakeAsset({ tokenId, tokenAddress, schemaName, }: {
    tokenId: string;
    tokenAddress: string;
    schemaName: string;
}): {
    id: string;
    token_id: string;
    num_sales: number;
    background_color: null;
    image_url: string;
    image_preview_url: string;
    image_thumbnail_url: null;
    image_original_url: null;
    animation_url: null;
    animation_original_url: null;
    name: string;
    description: null;
    external_link: string;
    asset_contract: {
        address: string;
        asset_contract_type: string;
        created_date: string;
        name: string;
        nft_version: string;
        opensea_version: null;
        owner: number;
        schema_name: string;
        symbol: string;
        total_supply: null;
        description: string;
        external_link: string;
        image_url: string;
        default_to_fiat: boolean;
        dev_buyer_fee_basis_points: number;
        dev_seller_fee_basis_points: number;
        only_proxied_transfers: boolean;
        opensea_buyer_fee_basis_points: number;
        opensea_seller_fee_basis_points: number;
        buyer_fee_basis_points: number;
        seller_fee_basis_points: number;
        payout_address: null;
    };
    permalink: string;
    collection: {
        payment_tokens: ({
            id: number;
            symbol: string;
            address: string;
            image_url: string;
            name: null;
            decimals: number;
            eth_price: number;
            usd_price: number;
        } | {
            id: number;
            symbol: string;
            address: string;
            image_url: string;
            name: string;
            decimals: number;
            eth_price: number;
            usd_price: number;
        })[];
        primary_asset_contracts: {
            address: string;
            asset_contract_type: string;
            created_date: string;
            name: string;
            nft_version: string;
            opensea_version: null;
            owner: number;
            schema_name: string;
            symbol: string;
            total_supply: null;
            description: string;
            external_link: string;
            image_url: string;
            default_to_fiat: boolean;
            dev_buyer_fee_basis_points: number;
            dev_seller_fee_basis_points: number;
            only_proxied_transfers: boolean;
            opensea_buyer_fee_basis_points: number;
            opensea_seller_fee_basis_points: number;
            buyer_fee_basis_points: number;
            seller_fee_basis_points: number;
            payout_address: null;
        }[];
        traits: {
            generation: {
                min: number;
                max: number;
            };
            fancy_ranking: {
                min: number;
                max: number;
            };
            cooldown_index: {
                min: number;
                max: number;
            };
            purrstige_ranking: {
                min: number;
                max: number;
            };
        };
        stats: {
            one_day_volume: number;
            one_day_change: number;
            one_day_sales: number;
            one_day_average_price: number;
            seven_day_volume: number;
            seven_day_change: number;
            seven_day_sales: number;
            seven_day_average_price: number;
            thirty_day_volume: number;
            thirty_day_change: number;
            thirty_day_sales: number;
            thirty_day_average_price: number;
            total_volume: number;
            total_sales: number;
            total_supply: number;
            count: number;
            num_owners: number;
            average_price: number;
            num_reports: number;
            market_cap: number;
            floor_price: number;
        };
        banner_image_url: string;
        chat_url: null;
        created_date: string;
        default_to_fiat: boolean;
        description: string;
        dev_buyer_fee_basis_points: string;
        dev_seller_fee_basis_points: string;
        discord_url: string;
        display_data: {
            card_display_style: string;
            images?: undefined;
        };
        external_url: string;
        featured: boolean;
        featured_image_url: string;
        hidden: boolean;
        safelist_request_status: string;
        image_url: string;
        is_subject_to_whitelist: boolean;
        large_image_url: string;
        medium_username: null;
        name: string;
        only_proxied_transfers: boolean;
        opensea_buyer_fee_basis_points: string;
        opensea_seller_fee_basis_points: string;
        payout_address: null;
        require_email: boolean;
        short_description: null;
        slug: string;
        telegram_url: null;
        twitter_username: string;
        instagram_username: null;
        wiki_url: string;
    };
    decimals: null;
    token_metadata: string;
    owner: {
        user: {
            username: string;
        };
        profile_img_url: string;
        address: string;
        config: string;
        discord_id?: undefined;
    };
    sell_orders: null;
    creator: {
        user: null;
        profile_img_url: string;
        address: string;
        config: string;
        discord_id?: undefined;
    };
    traits: never[];
    last_sale: null;
    top_bid: null;
    listing_date: null;
    is_presale: boolean;
    transfer_fee_payment_token: null;
    transfer_fee: null;
    related_assets: never[];
    orders: {
        created_date: string;
        closing_date: null;
        closing_extendable: boolean;
        expiration_time: number;
        listing_time: number;
        order_hash: string;
        metadata: {
            asset: {
                id: string;
                address: string;
            };
            schema: string;
        };
        exchange: string;
        maker: {
            user: {
                username: string;
            };
            profile_img_url: string;
            address: string;
            config: string;
        };
        taker: {
            user: {
                username: string;
            };
            profile_img_url: string;
            address: string;
            config: string;
        };
        current_price: string;
        current_bounty: string;
        bounty_multiple: string;
        maker_relayer_fee: string;
        taker_relayer_fee: string;
        maker_protocol_fee: string;
        taker_protocol_fee: string;
        maker_referrer_fee: string;
        fee_recipient: {
            user: {
                username: string;
            };
            profile_img_url: string;
            address: string;
            config: string;
        };
        fee_method: number;
        side: number;
        sale_kind: number;
        target: string;
        how_to_call: number;
        calldata: string;
        replacement_pattern: string;
        static_target: string;
        static_extradata: string;
        payment_token: string;
        payment_token_contract: {
            id: number;
            symbol: string;
            address: string;
            image_url: string;
            name: string;
            decimals: number;
            eth_price: string;
            usd_price: string;
        };
        base_price: string;
        extra: string;
        quantity: string;
        salt: string;
        v: number;
        r: string;
        s: string;
        approved_on_chain: boolean;
        cancelled: boolean;
        finalized: boolean;
        marked_invalid: boolean;
        prefixed_hash: string;
    }[];
    auctions: never[];
    supports_wyvern: boolean;
    top_ownerships: {
        owner: {
            user: {
                username: string;
            };
            profile_img_url: string;
            address: string;
            config: string;
        };
        quantity: string;
    }[];
    ownership: null;
    highest_buyer_commitment: null;
} | {
    id: string;
    token_id: string;
    num_sales: number;
    background_color: null;
    image_url: string;
    image_preview_url: string;
    image_thumbnail_url: string;
    image_original_url: null;
    animation_url: null;
    animation_original_url: null;
    name: string;
    description: null;
    external_link: null;
    asset_contract: {
        address: string;
        asset_contract_type: string;
        created_date: string;
        name: string;
        nft_version: null;
        opensea_version: string;
        owner: number;
        schema_name: string;
        symbol: string;
        total_supply: null;
        description: null;
        external_link: null;
        image_url: null;
        default_to_fiat: boolean;
        dev_buyer_fee_basis_points: number;
        dev_seller_fee_basis_points: number;
        only_proxied_transfers: boolean;
        opensea_buyer_fee_basis_points: number;
        opensea_seller_fee_basis_points: number;
        buyer_fee_basis_points: number;
        seller_fee_basis_points: number;
        payout_address: null;
    };
    permalink: string;
    collection: {
        payment_tokens: ({
            id: number;
            symbol: string;
            address: string;
            image_url: string;
            name: null;
            decimals: number;
            eth_price: number;
            usd_price: number;
        } | {
            id: number;
            symbol: string;
            address: string;
            image_url: string;
            name: string;
            decimals: number;
            eth_price: number;
            usd_price: number;
        })[];
        primary_asset_contracts: never[];
        traits: {
            generation?: undefined;
            fancy_ranking?: undefined;
            cooldown_index?: undefined;
            purrstige_ranking?: undefined;
        };
        stats: {
            one_day_volume: number;
            one_day_change: number;
            one_day_sales: number;
            one_day_average_price: number;
            seven_day_volume: number;
            seven_day_change: number;
            seven_day_sales: number;
            seven_day_average_price: number;
            thirty_day_volume: number;
            thirty_day_change: number;
            thirty_day_sales: number;
            thirty_day_average_price: number;
            total_volume: number;
            total_sales: number;
            total_supply: number;
            count: number;
            num_owners: number;
            average_price: number;
            num_reports: number;
            market_cap: number;
            floor_price?: undefined;
        };
        banner_image_url: null;
        chat_url: null;
        created_date: string;
        default_to_fiat: boolean;
        description: string;
        dev_buyer_fee_basis_points: string;
        dev_seller_fee_basis_points: string;
        discord_url: null;
        display_data: {
            card_display_style: string;
            images: never[];
        };
        external_url: null;
        featured: boolean;
        featured_image_url: null;
        hidden: boolean;
        safelist_request_status: string;
        image_url: string;
        is_subject_to_whitelist: boolean;
        large_image_url: null;
        medium_username: null;
        name: string;
        only_proxied_transfers: boolean;
        opensea_buyer_fee_basis_points: string;
        opensea_seller_fee_basis_points: string;
        payout_address: null;
        require_email: boolean;
        short_description: null;
        slug: string;
        telegram_url: null;
        twitter_username: null;
        instagram_username: null;
        wiki_url: null;
    };
    decimals: null;
    token_metadata: null;
    owner: {
        user: {
            username: string;
        };
        profile_img_url: string;
        address: string;
        config: string;
        discord_id: string;
    };
    sell_orders: null;
    creator: {
        user: {
            username: null;
        };
        profile_img_url: string;
        address: string;
        config: string;
        discord_id: string;
    };
    traits: never[];
    last_sale: null;
    top_bid: null;
    listing_date: null;
    is_presale: boolean;
    transfer_fee_payment_token: null;
    transfer_fee: null;
    related_assets: never[];
    orders: never[];
    auctions: never[];
    supports_wyvern: boolean;
    top_ownerships: {
        owner: {
            user: {
                username: null;
            };
            profile_img_url: string;
            address: string;
            config: string;
            discord_id: string;
        };
        quantity: string;
    }[];
    ownership: null;
    highest_buyer_commitment: null;
};
