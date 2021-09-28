import fs from "fs"
import readline from "readline"
import {BuiltInSymbols, SymbolTable as PremadeSymbols, JumpCodes, CompCodes, DestCodes} from "./config"

const baseDir = './IO/'
const files = fs.readdirSync(baseDir);

console.log("Running Assembler.")

files.forEach(async (file) => {
    const fileName = file.slice(0,file.indexOf('.'))
    const fileType = file.slice(file.indexOf('.'), file.length)
    if(!fileType.includes('asm'))return;
    console.log("Running on ", file)
    const input = fs.createReadStream(baseDir+file);
    const output = fs.createWriteStream(`${baseDir}${fileName}.hack`)
    AssembleFile(input, output)
})

async function AssembleFile(input,output){
    let SymbolTable = {...PremadeSymbols}
    Object.keys(SymbolTable).forEach(symbol => {
        SymbolTable[symbol] = DeciToBinary(SymbolTable[symbol])
    })

    const WriteLine = (content) => {
        output.write(content+"\n")
    }

    const cleanLine = (line) => {
        let cleanedLine = line.trim()
        const commentInd = cleanedLine.indexOf("/")
        if(commentInd != -1){
            cleanedLine = cleanedLine.slice(0,commentInd).trim()
        }
        return cleanedLine
    }

    const fileArr = []

    const Digesting = new Promise((resolve) => {
        const rl = readline.createInterface({ input });
        rl.on("line", line => fileArr.push(line))
        rl.on("close", () => resolve())
    })
    
    Digesting.then(() => {
        const HoistedSymbolTable = FirstPass(fileArr,cleanLine, SymbolTable)
        SecondPass(fileArr,cleanLine,HoistedSymbolTable,WriteLine)
    })

}

function FirstPass(fileArr, cleanLine, SymbolTable) {
    let lineInd = 0;
    const IncrementLine = () => {
        lineInd++
    }
    
    fileArr.forEach(line => HoistReferences(cleanLine(line), SymbolTable, lineInd, IncrementLine))
    return SymbolTable
}

function HoistReferences(line, SymbolTable, lineInd, IncrementLine){
    if(!IsValidLine(line))return
    if(IsReference(line)){
        const symbol = line.slice(1,line.indexOf(")"))
        SymbolTable[symbol] = DeciToBinary(lineInd)
    }else{
        IncrementLine();
    }
}

function SecondPass(fileArr, cleanLine, SymbolTable, WriteLine) {
    let variableInd = 16

    const IncrementVar = () => {
        variableInd++
    }

    fileArr.forEach(line => AssembleLine(cleanLine(line), SymbolTable, variableInd, IncrementVar, WriteLine))

  }

function AssembleLine(line, SymbolTable, variableInd, IncrementVar, WriteLine){
    if(!IsValidLine(line))return
    if(IsReference(line))return
    if(line[0] === BuiltInSymbols.symbol){
        const symbol = line.slice(1,line.length)
        if(SymbolTable[symbol] !== undefined){
            const content = 0 + SymbolTable[symbol]
            WriteLine(content)
        }else{
            let content
            if(isNaN(symbol)){
            SymbolTable[symbol] = DeciToBinary(variableInd)
            IncrementVar();

            content = '0' + SymbolTable[symbol]
            }else{
                content = DeciToBinary(symbol,'0')
            }
            WriteLine(content)
        }
    }else{
        let comp = ''
        let dest = DestCodes['null']
        let jump = JumpCodes['null']

        let jumpStart = line.indexOf(';');
        if(jumpStart != -1){
            const jumpCode = line.slice(jumpStart+1,line.length)
            const compCode = line.slice(0,jumpStart)
            comp = CompCodes[compCode];
            jump = JumpCodes[jumpCode];
        }else{
            const equalsInd = line.indexOf("=")
            const destCode = line.slice(0,equalsInd)
            dest = DestCodes[destCode]
            const compCode = line.slice(equalsInd+1, line.length)
            comp = CompCodes[compCode]
        }

        const content = '111' + comp + dest + jump
        WriteLine(content)
    }
}

function IsValidLine(line){
    if(line[0]!= '/' && line[0] != undefined){
        return true
    } else return false
}


function DeciToBinary(decmial, prefix){
    return prefix ? prefix + Number(decmial).toString(2).padStart(15,'0') : Number(decmial).toString(2).padStart(15,'0')
}

function IsReference(line){
    if(line[0] === '('){
        return true
    }else return false
}