import OpenLogin from "@toruslabs/openlogin";
import { WhiteLabelData } from "@toruslabs/openlogin-jrpc";

import loginConfig from "./loginConfig";

export const YOUR_PROJECT_ID = "BMrx-qoWCSt7_GWC1T0QUKEbM0EPb4V0W5uTyjxaIZNpjT14_8ySznR1wVqZggE2DMKW-7xPSGcXEydFdkPGemM";

let openLoginInstance: OpenLogin | null = null;

export function getOpenLoginInstance(whiteLabel?: WhiteLabelData) {
  if (!openLoginInstance) {
    openLoginInstance = new OpenLogin({
      // your clientId aka projectId , get it from https://dashboard.web3auth.io
      // clientId is not required for localhost, you can set it to any string
      // for development
      clientId: YOUR_PROJECT_ID,
      network: "development",
      uxMode: "popup",
      whiteLabel,
      loginConfig,
      storageKey: "session",
    });
  }
  return openLoginInstance;
}
