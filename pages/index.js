import React, { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import Admin from "./admin";
import {
  Header,
  HerpSection,
  Footer,
  Pools,
  PoolsModel,
  WithdrawModal,
  Withdraw,
  Partners,
  Statistics,
  Token,
  Loader,
  Notification,
  ICOSale,
  Contract, 
  Ask
} from "../Components/index";
import {
  CONTRACT_DATA,
  deposit,
  withdraw,
  claimReward,
  addTokenToMetamask,
} from "../Context/index";

const index = () => {
  return (
    <>
    <Header/>
    <Admin/>

    </>
  );
};

export default index;
