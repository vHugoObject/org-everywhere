import { readFileSync } from 'node:fs';
import path from 'path';


const readFixture = (fileName: string): string => {
  return readFileSync(path.join(__dirname, "fixtures", `${fileName}.org`), {encoding: "utf-8"})
}

export default readFixture
