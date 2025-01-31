import { WyvernProtocol } from "wyvern-js";
import { BigNumber } from "bignumber.js"; // Typescript import issue

export const DEFAULT_GAS_INCREASE_FACTOR = 1.01;
export const NULL_ADDRESS = WyvernProtocol.NULL_ADDRESS;
export const USDT_ADDRESS = "0x55d398326f99059ff775485246999027b3197955";
export const MGT_ADDRESS_TESTNET = "0x02548b76400a08C3ff473595C1F4Ecff0b5c90E9";
export const NULL_BLOCK_HASH =
  "0x0000000000000000000000000000000000000000000000000000000000000000";
export const OPENSEA_FEE_RECIPIENT =
  "0xCcd6cc00981952cA24e3ED61fE84B784f9cec9da";
export const DEP_INFURA_KEY = "e8695bce67944848aa95459fac052f8e";
export const MAINNET_PROVIDER_URL = "https://bsc-dataseed.binance.org/";
export const TESTNET_PROVIDER_URL =
  "https://data-seed-prebsc-1-s1.binance.org:8545/";
export const ROPSTEN_PROVIDER_URL =
  "https://ropsten.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161";
export const ETHEREUM_PROVIDER_URL =
  "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161";
export const RINKEBY_PROVIDER_URL =
  "https://rinkeby-api.opensea.io/jsonrpc/v1/";
export const INVERSE_BASIS_POINT = 10000;
export const MAX_UINT_256 = WyvernProtocol.MAX_UINT_256;
export const ENJIN_COIN_ADDRESS = "0xf629cbd94d3791c9250152bd8dfbdf380e2a3b9c";
export const MANA_ADDRESS = "0x0f5d2fb29fb7d3cfee444a200298f468908cc942";
export const ENJIN_ADDRESS = "0xfaaFDc07907ff5120a76b34b731b278c38d6043C";
export const ENJIN_LEGACY_ADDRESS =
  "0x8562c38485B1E8cCd82E44F89823dA76C98eb0Ab";
export const CK_ADDRESS = "0x06012c8cf97bead5deae237070f9587f8e7a266d";
export const CK_RINKEBY_ADDRESS = "0x16baf0de678e52367adc69fd067e5edd1d33e3bf";
export const WRAPPED_NFT_FACTORY_ADDRESS_MAINNET =
  "0xf11b5815b143472b7f7c52af0bfa6c6a2c8f40e1";
export const WRAPPED_NFT_FACTORY_ADDRESS_RINKEBY =
  "0x94c71c87244b862cfd64d36af468309e4804ec09";
export const WRAPPED_NFT_LIQUIDATION_PROXY_ADDRESS_MAINNET =
  "0x995835145dd85c012f3e2d7d5561abd626658c04";
export const WRAPPED_NFT_LIQUIDATION_PROXY_ADDRESS_RINKEBY =
  "0xaa775Eb452353aB17f7cf182915667c2598D43d3";
export const UNISWAP_FACTORY_ADDRESS_MAINNET =
  "0xc0a47dFe034B400B47bDaD5FecDa2621de6c4d95";
export const UNISWAP_FACTORY_ADDRESS_RINKEBY =
  "0xf5D915570BC477f9B8D6C0E980aA81757A3AaC36";
export const DEFAULT_WRAPPED_NFT_LIQUIDATION_UNISWAP_SLIPPAGE_IN_BASIS_POINTS = 1000;
export const CHEEZE_WIZARDS_GUILD_ADDRESS = WyvernProtocol.NULL_ADDRESS; // TODO: Update this address once Dapper has deployed their mainnet contracts
export const CHEEZE_WIZARDS_GUILD_RINKEBY_ADDRESS =
  "0x095731b672b76b00A0b5cb9D8258CD3F6E976cB2";
export const CHEEZE_WIZARDS_BASIC_TOURNAMENT_ADDRESS =
  WyvernProtocol.NULL_ADDRESS; // TODO: Update this address once Dapper has deployed their mainnet contracts
export const CHEEZE_WIZARDS_BASIC_TOURNAMENT_RINKEBY_ADDRESS =
  "0x8852f5F7d1BB867AAf8fdBB0851Aa431d1df5ca1";
export const DECENTRALAND_ESTATE_ADDRESS =
  "0x959e104e1a4db6317fa58f8295f586e1a978c297";
export const STATIC_CALL_TX_ORIGIN_ADDRESS =
  "0xbff6ade67e3717101dd8d0a7f3de1bf6623a2ba8";
export const STATIC_CALL_TX_ORIGIN_RINKEBY_ADDRESS =
  "0xe291abab95677bc652a44f973a8e06d48464e11c";
export const STATIC_CALL_CHEEZE_WIZARDS_ADDRESS = WyvernProtocol.NULL_ADDRESS; // TODO: Deploy this address once Dapper has deployed their mainnet contracts
export const STATIC_CALL_CHEEZE_WIZARDS_RINKEBY_ADDRESS =
  "0x8a640bdf8886dd6ca1fad9f22382b50deeacde08";
export const STATIC_CALL_DECENTRALAND_ESTATES_ADDRESS =
  "0x93c3cd7ba04556d2e3d7b8106ce0f83e24a87a7e";
export const DEFAULT_BUYER_FEE_BASIS_POINTS = 0;
export const DEFAULT_SELLER_FEE_BASIS_POINTS = 250;
export const OPENSEA_SELLER_BOUNTY_BASIS_POINTS = 100;
export const DEFAULT_MAX_BOUNTY = DEFAULT_SELLER_FEE_BASIS_POINTS;
export const MIN_EXPIRATION_SECONDS = 10;
export const ORDER_MATCHING_LATENCY_SECONDS = 60 * 60 * 24 * 7;
export const SELL_ORDER_BATCH_SIZE = 50;
export const ORDERBOOK_VERSION: number = 1;
export const API_VERSION: number = 1;
export const API_BASE_MAINNET =
  "https://us-central1-trophee-beta.cloudfunctions.net";
export const API_BASE_TESTNET =
  "https://us-central1-trophee-beta-uat.cloudfunctions.net";
export const API_BASE_RINKEBY = "https://rinkeby-api.opensea.io";
export const SITE_HOST_MAINNET = "https://opensea.io";
export const SITE_HOST_RINKEBY = "https://rinkeby.opensea.io";
export const ORDERBOOK_PATH = `/wyvern/v${ORDERBOOK_VERSION}`;
export const API_PATH = `/api/v${ORDERBOOK_VERSION}`;
