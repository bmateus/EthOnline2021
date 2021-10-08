import React, { useEffect, useState } from "react";
import "./styles.css";
import { Button } from "antd";
import Unity, { UnityContext } from "react-unity-webgl";
import Moralis from "moralis";
import { useMoralis } from "react-moralis";

const PictureFrameInfo = Moralis.Object.extend("PictureFrameInfo");

const unityContext = new UnityContext({
  loaderUrl: "Worldbuilder/Build/Worldbuilder.loader.js",
  dataUrl: "Worldbuilder/Build/Worldbuilder.data",
  frameworkUrl: "Worldbuilder/Build/Worldbuilder.framework.js",
  codeUrl: "Worldbuilder/Build/Worldbuilder.wasm",
  streamingAssetsUrl: "Worldbuilder/Build/streamingassets",
  webglContextAttributes: {
    preserveDrawingBuffer: true,
  },
});

export const smartTrim = (string, maxLength) => {
  if (maxLength < 1) return string;
  if (string.length <= maxLength) return string;
  if (maxLength === 1) return `${string.substring(0, 1)}...`;

  const midpoint = Math.ceil(string.length / 2);
  const toremove = string.length - maxLength;
  const lstrip = Math.ceil(toremove / 2);
  const rstrip = toremove - lstrip;
  return `${string.substring(0, midpoint - lstrip)}...${string.substring(midpoint + rstrip)}`;
};

export default function UnityGameContainer() {
  const [isUnityMounted, setIsUnityMounted] = useState(true);
  const [progression, setProgression] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  //moralis
  const { authenticate, isAuthenticated, user, logout } = useMoralis();

  const handleWalletClick = () => {
    if (!isAuthenticated) {
      authenticate();
    } else logout();
  };

  useEffect(() => {
    console.log("user:", user);
    unityContext.send("Web3Manager", "UserChanged", user ? user.get("ethAddress") : "");
    if (user) {
      //setIsUnityMounted(true);
      setupMoralisSubs();
    } else {
      //setIsUnityMounted(false);
    }
  }, [user]);

  const WalletButton = () => {
    //if (user) console.log(user.get("ethAddress"));
    return (
      <button className="walletContainer" onClick={handleWalletClick}>
        {isAuthenticated ? (
          <div className="walletAddress">
            {/*<Jazzicon diameter={24} seed={jsNumberForAddress(user.get("ethAddress"))} />*/}
            <div className="connectedDetails">
              <p>Disconnect</p>
              <p>{smartTrim(user.get("ethAddress"), 8)}</p>
            </div>
          </div>
        ) : (
          "Connect"
        )}
      </button>
    );
  };

  useEffect(() => {
    if (isLoaded) {
      unityContext.send("Web3Manager", "UserChanged", user ? user.get("ethAddress") : "");
    }
  }, [isLoaded]);

  useEffect(() => {
    unityContext.on("canvas", handleOnUnityCanvas);
    unityContext.on("progress", handleOnUnityProgress);
    unityContext.on("loaded", handleOnUnityLoaded);
    unityContext.on("SendReactMessage", handleReactMessage);
    unityContext.on("SignTransaction", handleSignTransactionRequest);
    unityContext.on("SavePictureFrameInfo", handleSavePictureFrameInfo);
    return () => {
      unityContext.removeAllEventListeners();
    };
  }, []);

  function handleOnUnityCanvas(canvas) {
    const context = canvas.getContext("webgl");
    const contextAttributes = context?.getContextAttributes();
    console.log(contextAttributes);
    canvas.setAttribute("role", "unityCanvas");
    //canvas.width = 480;
    //canvas.height = 320;
  }

  function handleOnUnityProgress(progression) {
    setProgression(progression);
  }

  function handleOnUnityLoaded() {
    console.log("==> Unity Loaded");
    //log in as the current wallet user
    setIsLoaded(true);
  }

  async function handleReactMessage(message, args) {
    if (message === "GetNFTs") {

      const forUser = args === "" ? Moralis.User.current().get("ethAddress") : args;

      let options = {
        address: forUser,
      };

      const nfts = {results:[]};

      options.chain = "eth";
      const ethNFTs = await Moralis.Web3API.account.getNFTs(options);
      console.log("Got Ethereum NFTs:", JSON.stringify(ethNFTs));

      options.chain =  "polygon";
      const polygonNFTs = await Moralis.Web3API.account.getNFTs(options);
      console.log("Got Polygon NFTs:", JSON.stringify(polygonNFTs));

      nfts.result = [...ethNFTs.result, ...polygonNFTs.result];

      //send back to unity
      unityContext.send("Web3Manager", "OnNftData", JSON.stringify(nfts));
    }
    else if (message === "GetPictureFrameInfos")
    {
      const forUser = args === "" ? Moralis.User.current().get("ethAddress") : args;
      const  query = new Moralis.Query('PictureFrameInfo')
				.equalTo('user_id', forUser)
      const pictureFrameInfos = await query.find();
      
      //send back to unity
      console.log(['{"infos":',JSON.stringify(pictureFrameInfos),'}'].join());
      unityContext.send("Web3Manager", "OnPictureFrameData", ['{"infos":',JSON.stringify(pictureFrameInfos),'}'].join(' '));
    }
  }

  async function handleSignTransactionRequest(rawTransaction) {
    const txnObj = JSON.parse(rawTransaction);
    const web3 = await Moralis.Web3.enable();
    console.log("web3:", web3);
    const accounts = await web3.eth.getAccounts();
    //console.log("balance:", await web3.eth.getBalance(accounts[0]));
    txnObj.from = accounts[0];
    txnObj.value = web3.utils.toWei(txnObj.value);
    txnObj.gasLimit = 21000;
    const gasPrice = await web3.eth.getGasPrice();
    console.log("gas price:" + gasPrice);
    txnObj.gasPrice = gasPrice;
    const result = await web3.eth.sendTransaction(txnObj);
    console.log("signing result:", result);
  }

  async function handleSavePictureFrameInfo(frameId, tokenAddress, tokenId)
  {
    console.log("saving picture frame info:", frameId, tokenId, tokenAddress);

    const  query = new Moralis.Query('PictureFrameInfo')
				.equalTo('user_id', Moralis.User.current().get("ethAddress"))
				.equalTo('frame_id', frameId)
    let pictureFrameInfo = await query.first();

    if (!pictureFrameInfo)
    {
      pictureFrameInfo = new PictureFrameInfo();
      pictureFrameInfo.set('user_id', Moralis.User.current().get("ethAddress"))
      pictureFrameInfo.set('frame_id', frameId);
    }

    pictureFrameInfo.set('token_address', tokenAddress);
    pictureFrameInfo.set('token_id', tokenId);
    pictureFrameInfo.save();
  }

  //set up a moralis query subscription
  async function setupMoralisSubs() {
    console.log("setting up moralis subs");
    const query = new Moralis.Query("UnityTest");
    const subscription = await query.subscribe();
    subscription.on("update", event => {
      //forward to unity
      console.log("Got new event:", event);
      unityContext.send("Web3Manager", "OnMoralisEvent", JSON.stringify(event)); //gross?
    });
    return subscription;
  }

  return (
    <>
      <div className="wrapper">
        
        <div className="navbar">
          <h1 className="title"> The NFT Gallery</h1>
          <WalletButton />
        </div>
        
        {isUnityMounted === true && (
          <>
            <div className="unity-container">
              {isLoaded === false && (
                <div className="loading-overlay">
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: progression * 100 + "%" }} />
                  </div>
                </div>
              )}
              <Unity
                className="unity-canvas"
                //devicePixelRatio={2}
                //matchWebGLToCanvasSize={false}
                unityContext={unityContext}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}
