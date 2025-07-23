/* global __dirname */

import fs from 'fs';
import path from 'path';
import { render } from "vitest-browser-react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";


export const setup = (jsx: React.JSX.Element) => {
  return {
    user: userEvent.setup(),
    ...render(jsx),
  };
};

export const renderWithRouter = (ui: React.ReactNode, { route = "/" } = {}) => {
  window.history.pushState({}, "Test page", route);

  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: BrowserRouter }),
  };
};


export default function readFixture(name) {
  return fs.readFileSync(path.join(__dirname, `./fixtures/${name}.org`)).toString();
}
