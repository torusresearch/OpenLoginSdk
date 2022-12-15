<template>
  <div id="app">
    <div v-if="loading">
      <div class="loader-wrap">
        <h1>....loading</h1>
      </div>
    </div>
    <div>
      <!-- <div v-if="!privKey && !loading">
        <h3>Login With Openlogin</h3>
        <button @click="login">login</button>
        <button @click="loginWithoutWhitelabel">login without whitelabel</button>
      </div> -->
      <div class="grid text-center justify-center pt-20" v-if="!privKey && !loading">
        <h7 class="font-bold text-3xl">demo-openlogin.web3auth.io</h7>
        <h6 class="pb-10 font-semibold text-[#595857]">Login With Openlogin</h6>
        <div>
          <button @click="login" class="btn-login">Login</button>
          <button @click="loginWithoutWhitelabel" class="btn-login">Login with Whitelabel</button>
        </div>
      </div>

      <div v-if="privKey">
        <div class="flex box md:rows-span-2 m-6 text-left">
          <div class="mt-7 ml-6 text-ellipsis overflow-hidden">
            <h7 class="text-2xl font-semibold">demo-openlogin.web3auth.io</h7>
            <h6 class="pb-8 text-left text-ellipsis overflow-hidden">Openlogin Private key : {{ privKey }}</h6>
          </div>
          <div class="ml-auto mt-7">
            <span class="pr-32">Connected ChainId : {{ ethereumPrivateKeyProvider.state.chainId }}</span>
            <button type="button" @click="logout" class="btn-logout">
              <img src="@/assets/logout.svg" class="pr-3 pl-0" />
              Logout
            </button>
          </div>
        </div>
        <div class="grid grid-cols-5 gap-7 m-6 height-fit">
          <div class="grid grid-cols-2 col-span-5 md:col-span-2 text-left gap-2 p-4 box">
            <div class="col-span-2 text-left">
              <div class="font-semibold">User Info</div>
              <div class="grid grid-cols-2 gap-2">
                <button class="btn" @click="getUserInfo">Get user info</button>
                <button class="btn" @click="getEd25519Key">Get Ed25519Key</button>
                <button @click="enableMfa">Setup Mfa</button>
                <button @click="showSettings">Show Settings</button>
              </div>
            </div>
            <div class="col-span-2 text-left">
              <div class="font-semibold">Signing</div>
              <div class="grid grid-cols-2 gap-2">
                <button class="btn" @click="signMessage" :disabled="!ethereumPrivateKeyProvider.provider">Sign test Eth Message</button>
                <button class="btn" @click="signV1Message" :disabled="!ethereumPrivateKeyProvider.provider">Sign Typed data v1 test message</button>
                <button class="btn" @click="latestBlock" :disabled="!ethereumPrivateKeyProvider.provider">Fetch latest block</button>
                <button class="btn" @click="addChain" :disabled="!ethereumPrivateKeyProvider.provider">Add Rinkeby Chain</button>
                <button class="btn" @click="switchChain" :disabled="!ethereumPrivateKeyProvider.provider">Switch to rinkeby</button>
              </div>
            </div>
            <div class="col-span-2 text-left">
              <div class="grid grid-cols-2 gap-2"></div>
            </div>
            <div class="col-span-2 text-left">
              <div class="grid grid-cols-2 gap-2"></div>
            </div>
            <div class="col-span-2 text-left">
              <div class="grid grid-cols-2 gap-2"></div>
            </div>
            <div class="col-span-2 text-left">
              <div class="grid grid-cols-2 gap-2"></div>
            </div>
            <div class="col-span-2 text-left">
              <div class="grid grid-cols-2 gap-2"></div>
            </div>
            <div class="col-span-2 text-left">
              <div class="grid grid-cols-2 gap-2"></div>
            </div>
            <div class="col-span-2 text-left">
              <div class="grid grid-cols-2 gap-2"></div>
            </div>
            <div class="col-span-2 text-left">
              <div class="grid grid-cols-2 gap-2"></div>
            </div>
          </div>
          <div class="box-grey" id="console">
            <p style="white-space: pre-line"></p>
            <div><button class="clear-button" @click="clearUiconsole">Clear console</button></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
/* eslint-disable */
import { getED25519Key } from "@toruslabs/openlogin-ed25519";
import { DEFAULT_INFURA_ID } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import * as bs58 from "bs58";
import Vue from "vue";

import * as ethWeb3 from "./lib/ethWeb3";
import { getOpenLoginInstance } from "./lib/openlogin";
import whitelabel from "./lib/whitelabel";

export default Vue.extend({
  name: "App",
  data() {
    return {
      loading: false,
      privKey: "",
      ethereumPrivateKeyProvider: null as EthereumPrivateKeyProvider | null,
    };
  },
  async mounted() {
    this.loading = true;
    const openlogin = getOpenLoginInstance(whitelabel);
    await openlogin.init();
    if (openlogin.privKey) {
      this.privKey = openlogin.privKey;
      await this.setProvider(this.privKey);
    }
    this.loading = false;
  },
  methods: {
    async login() {
      try {
        this.loading = true;
        const openlogin = getOpenLoginInstance(whitelabel);
        // in popup mode (with third party cookies available) or if user is already logged in this function will
        // return priv key , in redirect mode or if third party cookies are blocked then priv key be injected to
        // sdk instance after calling init on redirect url page.
        const privKey = await openlogin.login({
          mfaLevel: "optional",
          // pass empty string '' as loginProvider to open default torus modal
          // with all default supported login providers or you can pass specific
          // login provider from available list to set as default.
          // for ex: google, facebook, twitter etc
          loginProvider: "",
          redirectUrl: `${window.origin}`,
          // you can pass standard oauth parameter in extralogin options
          // for ex: in case of passwordless login, you have to pass user's email as login_hint
          // and your app domain.
          // extraLoginOptions: {
          //   domain: 'www.yourapp.com',
          //   login_hint: 'hello@yourapp.com',
          // },
          // sessionTime: 30, //seconds
          curve: "ed25519",
        });
        if (privKey) {
          this.privKey = openlogin.privKey;
          await this.setProvider(this.privKey);
        }
      } catch (error) {
        console.error(error);
      } finally {
        this.loading = false;
      }
    },
    async clearUiconsole() {
      const el = document.querySelector("#console>p");
      if (el) {
        el.innerHTML = "";
      }
    },

    async loginWithoutWhitelabel() {
      try {
        this.loading = true;
        const openLoginPlain = getOpenLoginInstance();
        const { privKey } = await openLoginPlain.login({
          mfaLevel: "mandatory",
          loginProvider: "",
          redirectUrl: `${window.origin}`,
          curve: "ed25519",
        });
        if (privKey) {
          this.privKey = privKey;
          await this.setProvider(this.privKey);
        }
      } catch (error) {
        console.error(error);
      } finally {
        this.loading = false;
      }
    },

    async setProvider(privKey: string) {
      this.ethereumPrivateKeyProvider = new EthereumPrivateKeyProvider({
        config: {
          chainConfig: {
            chainId: "0x3",
            rpcTarget: `https://ropsten.infura.io/v3/${DEFAULT_INFURA_ID}`,
            displayName: "ropsten",
            blockExplorer: "https://ropsten.etherscan.io/",
            ticker: "ETH",
            tickerName: "Ethereum",
          },
        },
      });
      await this.ethereumPrivateKeyProvider.setupProvider(privKey);
    },

    async getUserInfo() {
      const openlogin = getOpenLoginInstance();
      const userInfo = await openlogin.getUserInfo();
      this.printToConsole(userInfo);
    },
    async enableMfa() {
      const openlogin = getOpenLoginInstance();

      try {
        await openlogin.enableMfa();
      } catch (error) {
        console.log("error", error);
      } finally {
        this.privKey = openlogin.privKey;
      }
    },

    async showSettings() {
      const openlogin = getOpenLoginInstance();

      try {
        await openlogin.showSettings();
      } catch (error) {
        console.log("error", error);
      } finally {
        this.privKey = openlogin.privKey;
      }
    },

    getEd25519Key() {
      const openlogin = getOpenLoginInstance();
      const { sk } = getED25519Key(openlogin.privKey);
      const base58Key = bs58.encode(sk);
      this.printToConsole(base58Key);
    },
    async signMessage() {
      if (!this.ethereumPrivateKeyProvider?.provider) throw new Error("provider not set");
      const signedMessage = await ethWeb3.signEthMessage(this.ethereumPrivateKeyProvider.provider);
      this.printToConsole("signedMessage", signedMessage);
    },
    async signV1Message() {
      if (!this.ethereumPrivateKeyProvider?.provider) throw new Error("provider not set");
      const signedMessage = await ethWeb3.signTypedData_v1(this.ethereumPrivateKeyProvider.provider);
      this.printToConsole("signedMessage", signedMessage);
    },
    async latestBlock() {
      if (!this.ethereumPrivateKeyProvider?.provider) throw new Error("provider not set");

      const block = await ethWeb3.fetchLatestBlock(this.ethereumPrivateKeyProvider.provider);
      this.printToConsole("latest block", block);
    },
    async switchChain() {
      if (!this.ethereumPrivateKeyProvider?.provider) throw new Error("provider not set");
      try {
        await this.ethereumPrivateKeyProvider.provider.sendAsync({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x4" }],
        });
        this.printToConsole("switchedChain", this.ethereumPrivateKeyProvider.state, this.ethereumPrivateKeyProvider.config);
      } catch (error) {
        console.log("error while switching chain", error);
        this.printToConsole("switchedChain error", error);
      }
    },

    async addChain() {
      if (!this.ethereumPrivateKeyProvider?.provider) throw new Error("provider not set");
      try {
        await this.ethereumPrivateKeyProvider.provider.sendAsync({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x4",
              chainName: "rinkeby",
              nativeCurrency: {
                name: "ether",
                symbol: "ETH",
                decimals: 18,
              },
              rpcUrls: [`https://rinkeby.infura.io/v3/${DEFAULT_INFURA_ID}`],
              blockExplorerUrls: [`https://rinkeby.etherscan.io/`],
            },
          ],
        });
        this.printToConsole("added chain", this.ethereumPrivateKeyProvider.state, this.ethereumPrivateKeyProvider.config);
      } catch (error) {
        console.log("error while adding chain", error);
        this.printToConsole("add chain error", error);
      }
    },

    async logout() {
      const openlogin = getOpenLoginInstance();
      await openlogin.logout({});
      this.privKey = openlogin.privKey;
      this.ethereumPrivateKeyProvider = null;
    },
    printToConsole(...args: unknown[]) {
      const el = document.querySelector("#console>p");
      if (el) {
        el.innerHTML = JSON.stringify(args || {}, null, 2);
      }
    },
  },
});
</script>

<style>
.box {
  @apply bg-white;
  border: 1px solid #f3f3f4;
  border-radius: 20px;
  box-shadow: 4px 4px 20px rgba(46, 91, 255, 0.1);
}

.box-grey {
  @apply col-span-5 md:col-span-3 overflow-hidden min-h-[400px] bg-[#f3f3f4] rounded-3xl relative;
  border: 1px solid #f3f3f4;
  box-shadow: 4px 4px 20px rgba(46, 91, 255, 0.1);
}
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
/* #app {
  font-family: 'DM Sans';
  font-style: normal;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
} */
#app {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}
/* button {
  height: 25px;
  margin: 5px;
  background: none;
  border-radius: 5px;
  cursor: pointer;
} */
.btn-login {
  @apply h-12 w-60 m-2 bg-white rounded-3xl font-[#6F717A] font-medium;
  border: 1px solid #6f717a;
}
#console {
  text-align: left;
  overflow: auto;
}
#console > p {
  @apply m-2;
}
.btn {
  @apply h-11 w-full m-0 bg-white rounded-3xl text-[#6F717A] text-sm lg:text-base font-medium;
  border: 1px solid #6f717a;
}

.btn-logout {
  @apply h-12 w-32 bg-white rounded-3xl pl-6 m-2 text-sm inline-flex items-center;
  border: 1px solid #f3f3f4;
}
.clear-button {
  @apply absolute md:fixed right-8 bottom-2 md:right-8 md:bottom-12 w-28 h-7 bg-[#f3f3f4] rounded-md;
  border: 1px solid #0f1222;
}
.height-fit {
  @apply min-h-fit;
  height: 75vh;
}
</style>
