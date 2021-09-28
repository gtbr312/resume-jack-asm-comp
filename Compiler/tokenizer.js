import {LexicalElements} from './JackSpecification'

class Tokenizer{
    constructor(contentStream){
        this.contentStream = contentStream;
        this.tokenStream = [];
        this.ConstructTokenStream();
        this.currentTokenInd = -1;
    }

    ConstructTokenStream(){
        this.tokenStream = this.TokenizeBySpace(this.contentStream)
        LexicalElements.symbol.forEach(symbol => {
            let tokenStream = this.TokenizeBySymbol(symbol)
            this.tokenStream = tokenStream 
        })

        while(this.HasUnassembledStringConstant()){
            this.tokenStream = this.ReassembleStringConstants()
        }

    }

    HasUnassembledStringConstant(){
        let foundOpener = false
        for(let i = 0; i < this.tokenStream.length; i++){
            const token = this.tokenStream[i]
            if(token === `"` && token.length === 1){
                foundOpener = true
                break;
            }
        }
        return foundOpener
    }

    ReassembleStringConstants(){
        let operatingTokenStream = [...this.tokenStream]
        let slicedStream = [...this.tokenStream]
        const openingInd = operatingTokenStream.indexOf(`"`)
        const closingOffset = operatingTokenStream.slice(openingInd+1).indexOf(`"`) + 2
        const slicedElements = operatingTokenStream.slice(openingInd+1,openingInd+closingOffset-1)
        let stringConstant = ''
        slicedElements.forEach(token => {
            stringConstant+=token+" "
        })
        stringConstant = `"${stringConstant}"`
        slicedStream.splice(openingInd, closingOffset, stringConstant)
        return slicedStream
    }

    
    TokenizeBySymbol(symbol){
        const tokenStream = this.tokenStream;
        const updatedTokenStream = []
        tokenStream.forEach((line) => {
            if(line.indexOf(symbol) === -1){
                updatedTokenStream.push(line)
            }else{
                updatedTokenStream.push(...this.TokenizeLineBySymbol(line,symbol))
            }
        })
        return updatedTokenStream
    }
    
    TokenizeLineBySymbol(line,symbol){
        let slicedLine = line
        let splitTokens = []

            while(slicedLine.indexOf(symbol) !== -1 && slicedLine.length > 1){
                const foundSymbolInd = slicedLine.indexOf(symbol)
                let preceedingContent = slicedLine.slice(0,foundSymbolInd)
                slicedLine = slicedLine.slice(foundSymbolInd+1)//this is old version slicedLine = slicedLine.slice(foundSymbolInd+1, slicedLine)
                
                if(preceedingContent){
                    splitTokens.push(preceedingContent)
                }
                
                splitTokens.push(symbol)
            }
            
            if(slicedLine.length > 0){
                splitTokens.push(slicedLine)
            }

        return splitTokens
    }

    TokenizeBySpace(contentStream){
        const splitTokens = []
        contentStream.forEach((element, i) => {
            const toInsert = element.split(' ')
            splitTokens.push(...toInsert)
        });
        return splitTokens
    }

    GetTokens(){
        return this.tokenStream
    }

    HasAnotherToken(){
        return this.currentTokenInd < this.tokenStream.length - 1
    }

    Advance(){
        this.currentTokenInd++
    }

    GetXMLCurrentToken(output){
        return this.WrapWithLexicalType(this.tokenStream[this.currentTokenInd])
    }

    GetTokenType(){
        const token = this.tokenStream[this.currentTokenInd]
            switch(true){
                case this.IsSymbol(token):{
                    return LexicalElements.symbol
                }
                case this.IsKeyword(token):{
                    return LexicalElements.keyword
                }
                case this.IsIntConstant(token):{
                    return LexicalElements.integerConstant
                }
                case this.IsStringConstant(token):{
                    return LexicalElements.IsStringConstant
                }
                case this.IsIdentifier(token):{
                    return LexicalElements.IsIdentifier
                }
                default:
                    return `<identifier> ERROR <identifier>`
            } 
    }

    GetToken(){
        if(this.IsStringConstant(this.tokenStream[this.currentTokenInd]))
        {
            return this.tokenStream[this.currentTokenInd].slice(1, this.tokenStream[this.currentTokenInd].length-1)
        }

        return this.tokenStream[this.currentTokenInd]
    }
    
    WrapWithLexicalType(token){
        switch(true){
            case this.IsSymbol(token):{
                return `<symbol> ${token} </symbol>`
            }
            case this.IsKeyword(token):{
                return `<keyword> ${token} </keyword>`
            }
            case this.IsIntConstant(token):{
                return `<integerConstant> ${token} </integerConstant>`
            }
            case this.IsStringConstant(token):{
                return `<stringConstant> ${token.slice(1,token.length-2)} </stringConstant>`
            }
            case this.IsIdentifier(token):{
                return `<identifier> ${token} </identifier>`
            }
            default:
                return `<identifier> ERROR <identifier>`
        }
    }

    IsIdentifier(token){
        if(isNaN(parseInt(token))){
            return true
        }else return false
    }

    IsSymbol(token){
        if(LexicalElements.symbol.includes(token)){
            return true
        }else return false
    }

    IsKeyword(token){
        if(LexicalElements.keyword.includes(token)){
            return true
        }else return false
    }

    IsIntConstant(token){
        if(Number.isInteger(parseInt(token))){
            return true
        }else return false
    }

    IsStringConstant(token){
        if(token[0] === `"`){
            return true
        }else return false
    }
    
}

export default Tokenizer