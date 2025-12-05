import React from "react";

const AdminCard = ({name, value}) => {
  return (
  <div className="col-12 col-md-4">
    <div className="stats ">
      <span className="stats__value" style={{display: 'block', textAlign: 'center'}}>{value}</span>
      <p className={"stats__name"} style={{textAlign: 'center'}}>{name}</p>
    </div>
  </div>)
};

export default AdminCard;
