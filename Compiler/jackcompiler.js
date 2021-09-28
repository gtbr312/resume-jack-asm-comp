import fs from "fs"
import readline from "readline"
import {baseDir} from './config'
import { cleanLine } from "./utils"
import Tokenizer from "./tokenizer"
import CompilationEngine from "./CompilationEngine"

const files = fs.readdirSync(baseDir)

files.forEach(file => {
    const fileName = file.slice(0,file.indexOf('.'))
    const fileType = file.slice(file.indexOf('.'), file.length)
    if(!fileType.includes('jack'))return;

    const input = fs.createReadStream(baseDir+file);
 
    const contentArr = []
    let contentStream = []

    const Digesting = new Promise(resolve => {
        const rl = readline.createInterface({ input });
        rl.on("line", line => {
            const cleanedLine = cleanLine(line)
            if(cleanedLine === null)return;

            contentArr.push(cleanedLine)
            contentStream += cleanedLine;
        })
        rl.on("close", () => resolve())
    })

    Digesting.then(() => {
        const Compiler = new JackCompiler(fileName, contentArr);
        Compiler.Compile();
    })
})

class JackCompiler{
    constructor(fileName, contentArr){
        this.contentArr = contentArr;
        this.XMLoutput = fs.createWriteStream(`${"./XML Trees/"}${fileName}.xml`)
        this.VMoutput = fs.createWriteStream(`${"./VM Code/"}${fileName}.vm`)
    }

    Compile(){
        const tokenizer = new Tokenizer(this.contentArr);
        const tokens = tokenizer.GetTokens()

        const XMLTokens = []

        while(tokenizer.HasAnotherToken()){
            tokenizer.Advance();
            const wrappedToken = tokenizer.GetXMLCurrentToken(this.XMLoutput)
            XMLTokens.push(wrappedToken)
        }
        const parser = new CompilationEngine(XMLTokens, this.VMoutput);
        parser.Start();
        const parsedTokens = parser.GetParsedTokens();
        parsedTokens.forEach(token => this.XMLoutput.write(token))
    }
}



