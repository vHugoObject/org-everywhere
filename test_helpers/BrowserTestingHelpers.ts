import React from "react";
import { render, type RenderResult } from "vitest-browser-react";
import { type UserEvent, userEvent } from "vitest/browser";
import { BrowserRouter } from "react-router-dom";

export const setup = async (
  jsx: React.JSX.Element,
): Promise<{ user: UserEvent; screen: RenderResult }> => {
  const screen = await render(jsx);
  return {
    user: userEvent.setup(),
    screen,
  };
};

export const renderWithRouter = (ui: React.ReactNode, { route = "/" } = {}) => {
  window.history.pushState({}, "Test page", route);

  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: BrowserRouter }),
  };
};

export const sleep = async (ms: number): Promise<void> =>
  await new Promise((resolve) => setTimeout(resolve, ms));
