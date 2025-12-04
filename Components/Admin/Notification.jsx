import React, {useEffect, useState} from "react";

const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY;
import List from "./RegularComp/List";

const Notification = ({index, notify, poolDetails}) => {
  const [percentage, setPercentage] = useState();

  useEffect(()=>{
    const calculatePercentage = () =>{
      const amount = notify?.amount ?? 0;
      const percentageNew = (amount/100)*100;

      if(percentageNew === 0) {
        console.log("Token balance is zero, cannot calculate percentage");
      } else {
        setPercentage(percentageNew);
      }
    };

    const timer = setTimeout(calculatePercentage, 1000);
    return ()=> clearTimeout(timer);
  }, [notify]);
  return <div key = {index} className="deposit">
    <div className="deposite__name">
      <span
        style={{
          color: "white",
        }}
        className={`deposit__icon deposit__icon--$
          {
            index == 0 ? "orange" : index == 1 ?
            "green" : "blue"
          }`}
          >
            {CURRENCY}
          </span>
          <h3 className="deposit__title">{notify?.typeOf}</h3>
    </div>
    <ul className="deposit__list">
      <List name={"Pool ID"} value={`#00-1${notify?.poolID}`}/>
      <List name={"Date"} value={`#00-1${notify?.timestamp}`}/>
      <List name={"Amount"} value={`#00-1${notify?.amount}`}/>
      <List name={"User"} value={`#00-1${notify?.user}`}/>
    </ul>
    <div className={`progressbar progressbar--${
    index == 0 ? "orange" : index == 1 ? "green" : "blue"
    }`}
    >
      <h3 className="progressbar__title">Accrued {notify?.amount} %</h3>
      <div 
        className="progress"
        role = "progressbar"
        aria-valuenow={75}
        aria-valuemin={0}
        aria-valuemax={100}
        >
          <div className="progressbar-bar progress-bar-striped progress-bar-animated"
                style={{
                  width: `${percentage}`,
                }}
                >
                  <span>{percentage?.toString().slice(0,2)}</span>
                </div>
        </div>
        <div className="progressbar__values">
          <span className="progress__value progressbar__value--left">0%</span>
          <span className="progress__value progressbar__value--right">100%</span>
        </div>
    </div>

    <div className="deposit__profile">
      <span>Token</span>
      <p>{poolDetails?.rewardToken.symbol}</p>
    </div>
  </div>
};

export default Notification;
