import React from "react";

import "./stylesheet.css";

import { ArrowRight } from "react-feather";

export default () => {
  return (
    <>
      <nav className="navbar navbar-marketing navbar-expand-lg bg-transparent navbar-dark fixed-top navbar-scrolled">
        <div className="container px-5">
          <div className="collapse navbar-collapse" id="navbarSupportedContent">
            <a
              className="btn fw-500 ms-lg-4 btn-teal"
              href="/org-everywhere/sign_in"
            >
              Sign in
              {/* <i className="ms-2" data-feather="arrow-right"></i> */}
              <ArrowRight className="ms-2" />
            </a>
          </div>
        </div>
      </nav>

      <div className="row gx-5 align-items-center">
        <div className="col-lg-6" data-aos="fade-up">
          <h1 className="page-header-ui-title">
            org-everywhere
          </h1>
          <p>You get the point</p>

          <a className="btn btn-teal fw-500 me-2" href="/org-everywhere/sample">
            Live demo
            {/* <i className="ms-2" data-feather="arrow-right"></i> */}
            <ArrowRight className="ms-2" />
          </a>

          <a
            className="btn btn-white fw-500 me-2"
            href="/org-everywhere/sign_in"
          >
            Sign in
            {/* <i className="ms-2" data-feather="arrow-right"></i> */}
            <ArrowRight className="ms-2" />
          </a>
        </div>
      </div>
    </>
  );
};
