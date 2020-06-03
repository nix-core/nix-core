import React from "react";
import queryString from "query-string";

import styles from "./index-page.module.scss";

import { config } from "../chaos-client";

export const IndexPage = () => (
  <div className={styles.indexPage}>
    <DiscordLoginBtn/>
  </div>
);

const DiscordLoginBtn = () => {
  function onClick() {
    document.location = queryString.stringifyUrl({
      url: "https://discord.com/api/oauth2/authorize",
      query: {
        "client_id": config.clientId,
        "redirect_uri": config.clientUrl + "/login/callback",
        "response_type": "code",
        "scope": "identify guilds",
        "prompt": "none",
      },
    });
  }

  return (
    <div className={styles.discordLoginBtn} onClick={onClick}>
      Login with Discord
    </div>
  );
};
