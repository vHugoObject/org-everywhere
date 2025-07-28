import Color from 'color'
import type {ColorObject} from 'color';
import { curry, property, pipe, forEach, partialRight, zipObject } from "lodash/fp"
import { themes } from "./constants"

export const createColorInstance =  partialRight(Color, [null])
export const convertColorInstanceIntoObject =  Function.prototype.call.bind(Color.prototype.object)
export const convertColorInstanceIntoCSS =  Function.prototype.call.bind(Color.prototype.string)
export const createColorObject = pipe([Array.of, zipObject(["r", "g", "b", "alpha"])])
export const convertRGBAIntoCSS = pipe([createColorInstance, convertColorInstanceIntoCSS])


// Interpolates between two colors.
// colorA and colorB should be objects with keys {r, g, b, a}.
// interpolationFactor should be a number between 0 and 1 representing how far from colorA to
// colorB it should interpolate.
// An object with keys {r, g, b, a} will be returned.

export const interpolateColors = (colorA: ColorObject, colorB: ColorObject, interpolationFactor: number): ColorObject => {

  const alpha: number = colorB.alpha && colorA.alpha ? (colorB.alpha - colorA.alpha) * interpolationFactor + colorA.alpha : 0
  return {
    r: (colorB.r - colorA.r) * interpolationFactor + colorA.r,
    g: (colorB.g - colorA.g) * interpolationFactor + colorA.g,
    b: (colorB.b - colorA.b) * interpolationFactor + colorA.b,
    alpha
  };
};

export const interpolateColorsAndReturnCSS = pipe([interpolateColors, convertRGBAIntoCSS])

export const readRgbaVariable = (varName: string): ColorObject => {
  const varValue = getComputedStyle(document.documentElement).getPropertyValue(varName);
  return createColorObject(varValue)
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
      colorScheme = 'Dark';
    }
  }
  const style = document.documentElement.style;
  pipe([
    getThemeFromThemeObject,
    Object.entries,
    forEach(([k,v]: [string, string]) => {
      style.setProperty(k, v)
    })
  ])(theme, colorScheme)
  
};
