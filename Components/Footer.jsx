import React from "react";

// INTERNAL IMPORT
import {
  TiSocialTwitter,
  TiSocialLinkedin,
  TiSocialFacebook,
} from "./ReactICON/index";

const Footer = () => {
  const social = [
    { link: "#", icon: <TiSocialTwitter /> },
    { link: "#", icon: <TiSocialFacebook /> },
    { link: "#", icon: <TiSocialLinkedin /> },
  ];

  return (
    <footer className="footer">
      <div className="container">

        <div className="row">

          {/* LOGO + COPYRIGHT */}
          <div className="col-12 col-sm-8 col-md-6 col-lg-4 order-1 order-lg-4 order-xl-1">
            <div className="footer__logo">
              <img src="img/logo.svg" alt="" />
            </div>
            <p className="footer__tagline">
              © 2024 Cryptic Stakes. All rights reserved.
            </p>
          </div>

          {/* ⬇️ These 3 columns now stay on SAME row ⬇️ */}
          {/* COMPANY */}
          <div className="col-6 col-md-4 col-lg-2 order-3 order-md-2 order-lg-2 order-xl-3">
            <h6 className="footer__title">Company</h6>
            <div className="footer__nav">
              <a href="#">About Centure</a>
              <a href="#">Our news</a>
              <a href="#">License</a>
              <a href="#">Contacts</a>
            </div>
          </div>

          {/* SERVICES & FEATURES */}
          <div className="col-12 col-md-8 col-lg-4 order-2 order-md-3 order-lg-1">
            <h6 className="footer__title">Services &amp; Features</h6>
            <div className="row">
              <div className="col-6">
                <div className="footer__nav">
                  <a href="#">Invest</a>
                  <a href="#">Token</a>
                  <a href="#">Affiliate</a>
                  <a href="#">Contest</a>
                </div>
              </div>

              <div className="col-6">
                <div className="footer__nav">
                  <a href="#">Safety</a>
                  <a href="#">Automization</a>
                  <a href="#">Analytics</a>
                  <a href="#">Report</a>
                </div>
              </div>
            </div>
          </div>

          {/* SUPPORT */}
          <div className="col-6 col-md-4 col-lg-2 order-3 order-md-2 order-lg-3">
            <h6 className="footer__title">Support</h6>
            <div className="footer__nav">
              <a href="#">Help Centre</a>
              <a href="#">How it works</a>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms &amp; Conditions</a>
            </div>
          </div>

        </div>

        {/* SOCIAL + COPYRIGHT */}
        <div className="row mt-4">
          <div className="col-12">
            <div className="footer__content">
              <div className="footer__social">
                {social.map((item, index) => (
                  <a key={index} href={item.link} target="_blank">
                    {item.icon}
                  </a>
                ))}
              </div>
            </div>

            <small className="footer__copyright">
              © Centure, 2025 Created by{" "}
              <a href="#" target="_blank">@Prakriti0511</a>
            </small>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
