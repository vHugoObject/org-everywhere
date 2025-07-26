import Color from 'color'
import type {ColorObject} from 'color';
import { curry, property } from "lodash/fp"
import { themes } from "./constants"


// Interpolates between two colors.
// colorA and colorB should be objects with keys {r, g, b, a}.
// interpolationFactor should be a number between 0 and 1 representing how far from colorA to
// colorB it should interpolate.
// An object with keys {r, g, b, a} will be returned.

export const interpolateColors = (colorA: ColorObject, colorB: ColorObject, interpolationFactor: number): ColorObject => {
  return {
    r: (colorB.r - colorA.r) * interpolationFactor + colorA.r,
    g: (colorB.g - colorA.g) * interpolationFactor + colorA.g,
    b: (colorB.b - colorA.b) * interpolationFactor + colorA.b,
    a: (colorB.a - colorA.a) * interpolationFactor + colorA.a,
  };
};

// assumes var is either a longform-hex or rgb(a) color value
export const readRgbaVariable = (varName: string): ColorObject => {
  const varValue = getComputedStyle(document.documentElement).getPropertyValue(varName);
  return Color(varValue).object() 
};


export const getThemeFromThemeObject = curry((theme: string, colorScheme: string): Record<string, string> => {
  return property([theme, colorScheme], themes)
})

export const loadTheme = (theme: string = 'Solarized', colorScheme: string = 'Light'): void => {
  if (colorScheme === 'OS') {
    const osPreference = window.matchMedia('(prefers-color-scheme: dark)');
    if ('matches' in osPreference) {
      colorScheme = osPreference.matches ? 'Dark' : 'Light';
    } else {
      colorScheme = 'Light';
    }
  }
  // const style = document.documentElement.style;
  // Object.entries(themes[theme][colorScheme]).forEach(([k, v]) => style.setProperty(k, v));

  // // set theme color on android
  // document
  //   .querySelector('meta[name="theme-color"]')
  //   .setAttribute('content', themes[theme]['--base3']);
};
