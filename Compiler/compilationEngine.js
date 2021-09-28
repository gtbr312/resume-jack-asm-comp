import CodeWriter from "./CodeWriter"
import { jackClass, classVarDec, subroutineDec } from "./JackSpecification"

class CompilationEngine{
    constructor(XMLStream, output){
        this.XMLStream = XMLStream
        this.currentTokenInd = -1
        this.structuredXMLStream = []
        this.indentationLevel = 0
        this.ClassName = ''
        this.ClassSymbolTable = {}
        this.ScopedSymbolTable = {}
        this.labelCount = 0
        this.CW = new CodeWriter(output)
    }

    Start(){
        this.currentTokenInd = 0
        this.indentationLevel = 0
        this.CompileClass()
    }

    GetParsedTokens(){
        return this.structuredXMLStream
    }

    GetUnwrappedToken(ind){
        const token = this.XMLStream[ind !== undefined ? ind : this.currentTokenInd]
        const tagClose = token.indexOf(">")
        let unwrappedToken = token.slice(tagClose)
        const tagOpen = unwrappedToken.indexOf("<")
        const tagOpenAlt = unwrappedToken.indexOf("</")
        unwrappedToken = unwrappedToken.slice(2,tagOpenAlt-1)
        return unwrappedToken
    }

    Advance(){
        this.currentTokenInd++
    }

    IncrementIndentation(){
        this.indentationLevel++
    }

    DecrementIndentation(){
        this.indentationLevel--
    }

    CompileClass(){
        if(!this.ExactToken('class')){
            throw `The first token, ${this.CurrentToken()} is not a Jack Class`
        }
        this.push(`<class>`)
        this.IncrementIndentation()
        this.Step()
        
        if(!this.XMLIdentifier('identifier')){
            throw `Expected class name identifier, got ${this.CurrentToken()}`
        }
        this.ClassName = this.GetUnwrappedToken()
        this.CW.SetClassName(this.ClassName)
        this.Step()
        
        if(!this.ExactSymbol('{')){
            throw `Expected symbol {, got ${this.CurrentToken()}`
        }
        this.Step()
        while(this.IsType(['static', 'field'])){
            this.CompileClassVarDec()
        }

        while(this.IsType([ 'constructor', 'function', 'method'])){
            this.CompileSubroutineDec()
        }

        if(!this.ExactToken("}")){
            throw `1Expected {, got ${this.CurrentToken()}`
        }
        this.Step()

        this.DecrementIndentation()
        this.push("</class>")
    }

    TerminalCondition(pointer,i){
        return typeof pointer[i] === "string"// && this.GetUnwrappedToken() === pointer[i]
    }

    GetClassSymbolKindCount(kind){
        let i = 0
        for(const [key,value] of Object.entries(this.ClassSymbolTable)){
            if(value.kind === kind)i++
        }
        return i
    }

    GetScopedSymbolKindCount(kind){
        let i = 0
        for(const [key,value] of Object.entries(this.ScopedSymbolTable)){
            if(value.kind === kind)i++
        }
        return i
    }

    CompileClassVarDec(){     
        if(!this.IsType(['static', 'field'])){
            throw `Expected class var dec, instead got ${this.CurrentToken()}`
        }

        let kind = this.GetUnwrappedToken()
        let type
        let name

        this.push("<classVarDec>")
        this.IncrementIndentation()
        this.Step()
        if(!this.ExactTokenIncluded(['int', 'char', 'boolean']) && !this.XMLIdentifier('identifier')){
            throw `Expected type, instead got ${this.CurrentToken()}`
        }
        type = this.GetUnwrappedToken()
        this.Step()
        if(!this.XMLIdentifier('identifier')){
            throw `Expected varName identified, got ${this.CurrentToken()}`
        }
        name = this.GetUnwrappedToken()
        this.Step()
        this.ClassSymbolTable[name] = {scope:"Class", name, type, kind, count:this.GetClassSymbolKindCount(kind)}
        this.push(`//definition: ${this.ClassSymbolTable[name].scope} ${this.ClassSymbolTable[name].name}, ${this.ClassSymbolTable[name].type}, ${this.ClassSymbolTable[name].kind}, ${this.ClassSymbolTable[name].count}`)
        while(this.ExactToken(',')){
            if(!this.ExactToken(',')){
                throw `Expected , , got ${this.CurrentToken()}`
            }
            this.Step()
            if(!this.XMLIdentifier('identifier')){
                throw `Expected varName identified, got ${this.CurrentToken()}`
            }
            name = this.GetUnwrappedToken()
            this.Step()
            this.ClassSymbolTable[name] = {scope:"Class", name, type, kind, count:this.GetClassSymbolKindCount(kind)}
            this.push(`//definition: ${this.ClassSymbolTable[name].scope} ${this.ClassSymbolTable[name].name}, ${this.ClassSymbolTable[name].type}, ${this.ClassSymbolTable[name].kind}, ${this.ClassSymbolTable[name].count}`)
        }
        if(!this.ExactToken(';')){
            throw `Expected ; , got ${this.CurrentToken()}`
        }
        this.Step()
        this.DecrementIndentation()
        this.push("</classVarDec>")
    }

    CompileSubroutineDec(){
        this.push('<subroutineDec>')
        this.IncrementIndentation()
        if(!this.ExactTokenIncluded(['constructor', 'function', 'method'])){
            throw `Expected a subroutine declaration, got ${this.CurrentToken()}`
        }
        this.ScopedSymbolTable = {}
        if(this.ExactToken('method')){
            this.ScopedSymbolTable['this'] = {scope:"Subroutine", name:'this', type:this.ClassName, kind:'argument', count:0}//what segment should this be
            this.push(`//definition: ${this.ScopedSymbolTable['this'].name}, ${this.ScopedSymbolTable['this'].type}, ${this.ScopedSymbolTable['this'].kind}, ${this.ScopedSymbolTable['this'].count}`)
        }

        this.Step()
        this.returnPush = ''
        if(!this.ExactTokenIncluded(['void', 'int', 'char', 'boolean']) && !this.XMLIdentifier('identifier')){
            throw `Expected a subroutine type , got ${this.CurrentToken()}`
        }

        if(this.GetUnwrappedToken() === 'void'){
            this.returnPush = 'void'
        }        

        this.Step()

        
        if(!this.XMLIdentifier('identifier')){
            throw `Expected a subroutine name, got ${this.CurrentToken()}`
        }
        const funcName = this.GetUnwrappedToken()
        this.Step()

        if(!this.ExactToken('(')){
            throw `Expected symbol {, got ${this.CurrentToken()}`
        }
        this.Step()
        
        const argsCount = this.PossibleParameterList()

        if(!this.ExactToken(')')){
            throw `Expected symbol {, got ${this.CurrentToken()}`
        }

        //this.CW.WriteFunction(funcName, Object.keys(this.ScopedSymbolTable).length)

        this.Step()
        this.CompileSubroutineBody(funcName, argsCount)

        this.DecrementIndentation()
        this.push("</subroutineDec>")
    }

    CompileSubroutineBody(funcName, argsCount){
        if(!this.ExactToken('{')){
            throw `Expected token {, got ${this.CurrentToken()}`
        }
        this.push("<subroutineBody>")
        this.IncrementIndentation()
        this.Step()

        let varCount = 0
        while(this.ExactToken('var')){
            let vars = this.CompileVarDec()
            varCount += vars
        }
        this.CW.WriteFunction(funcName, varCount)
        if(this.ScopedSymbolTable['this'] !== undefined){
                this.CW.WritePush('argument',0)
                this.CW.WritePop('pointer', 0)
        }

        let returnThis = false
        if(funcName === "new"){
            this.CW.WritePush('constant', Object.keys(this.ClassSymbolTable).length)//argsCount+Object.keys(this.ClassSymbolTable).length)
            this.CW.WriteCall(['Memory','.','alloc'],1)
            this.CW.WritePop('pointer',0)
            returnThis = true
        }
        if(this.ExactTokenIncluded(['let','if','while','do','return'])){
            
            this.CompileStatements(returnThis)
        }
        if(!this.ExactToken('}')){
            throw `1Expected token }, got ${this.CurrentToken()}`
        }
        this.Step()
        this.DecrementIndentation()
        this.push("</subroutineBody>")
    }

    PossibleParameterList(){
        let argsCount = 0
        if(this.IsType(['int','char','boolean']) || this.XMLIdentifier('identifier')){
            argsCount += this.CompileParameterList()
        }else{
            //I hate this but I have to do it to match the comparison set by the courses implementation
            this.push('<parameterList>')
            this.push('</parameterList>')
        }
        return argsCount
    }

    CompileParameterList(){
        if(!this.ExactTokenIncluded(['int', 'char', 'boolean']) && !this.XMLIdentifier('identifier')){
            throw `Expected type declaration, got ${this.CurrentToken()}`
        }
        this.push('<parameterList>')
        this.IncrementIndentation()
        let type = this.GetUnwrappedToken()
        let kind = "argument"
        let name
        this.Step()
        if(!this.XMLIdentifier('identifier')){
            throw `1Expected variable name identifier, got ${this.CurrentToken()}`
        }
        name = this.GetUnwrappedToken()
        this.ScopedSymbolTable[name] = {scope:"Subroutine", name, type, kind, count:this.GetScopedSymbolKindCount(kind)}
        this.push(`//definition: ${this.ScopedSymbolTable[name].scope} ${this.ScopedSymbolTable[name].name}, ${this.ScopedSymbolTable[name].type}, ${this.ScopedSymbolTable[name].kind} ${this.ScopedSymbolTable[name].count}`)
        this.Step()

        let argsCount = 1
        while(this.ExactToken(',')){
            if(!this.ExactToken(',')){
                throw `Expected symbol , , got ${this.CurrentToken()}`
            }
            this.Step()
            if(!this.ExactTokenIncluded(['int', 'char', 'boolean']) && !this.XMLIdentifier('identifier')){
                throw `Expected type declaration, got ${this.CurrentToken()}`
            }
            argsCount++
            let type = this.GetUnwrappedToken()
            let kind = "argument"
            let name
            this.Step()
            if(!this.XMLIdentifier('identifier')){
                throw `2Expected variable name identifier, got ${this.CurrentToken()}`
            }
            name = this.GetUnwrappedToken()
            this.ScopedSymbolTable[name] = {scope:"Subroutine", name, type, kind, count:this.GetScopedSymbolKindCount(kind)}
            this.push(`//definition: ${this.ScopedSymbolTable[name].scope} ${this.ScopedSymbolTable[name].name}, ${this.ScopedSymbolTable[name].type}, ${this.ScopedSymbolTable[name].kind} ${this.ScopedSymbolTable[name].count}`)
            this.Step()
        }
        this.DecrementIndentation()
        this.push('</parameterList>')
        return argsCount
    }

    CompileVarDec(){
        if(!this.ExactToken('var')){
            throw `Expected keyword var, got ${this.CurrentToken()}`
        }
        this.push('<varDec>')
        this.IncrementIndentation()
        this.Step()
        if(!this.ExactTokenIncluded(['int', 'char', 'boolean']) && !this.XMLIdentifier('identifier')){
            throw `Expected type declaration, got ${this.CurrentToken()}`
        }

        let type = this.GetUnwrappedToken()
        let kind = "local"
        let name

        this.Step()
        if(!this.XMLIdentifier('identifier')){
            throw `Expected varName identified, got ${this.CurrentToken()}`
        }
        name = this.GetUnwrappedToken()
        this.ScopedSymbolTable[name] = {scope:"Subroutine", name, type, kind, count:this.GetScopedSymbolKindCount(kind)}
        this.push(`//definition: ${this.ScopedSymbolTable[name].scope} ${this.ScopedSymbolTable[name].name}, ${this.ScopedSymbolTable[name].type}, ${this.ScopedSymbolTable[name].kind} ${this.ScopedSymbolTable[name].count}`)
        this.Step()
        let varCount = 1
        while(this.ExactToken(',')){
            if(!this.ExactToken(',')){
                throw `Expected symbol , , got ${this.CurrentToken()}`
            }
            this.Step()
            varCount++
            if(!this.XMLIdentifier('identifier')){
                throw `Expected varName identified, got ${this.CurrentToken()}`
            }
            name = this.GetUnwrappedToken()
            this.ScopedSymbolTable[name] = {scope:"Subroutine", name, type, kind, count:this.GetScopedSymbolKindCount(kind)}
            this.push(`//definition: ${this.ScopedSymbolTable[name].scope} ${this.ScopedSymbolTable[name].name}, ${this.ScopedSymbolTable[name].type}, ${this.ScopedSymbolTable[name].kind} ${this.ScopedSymbolTable[name].count}`)
            this.Step()
        }
        if(!this.ExactToken(';')){
            throw `Expected exact symbol ;, got ${this.CurrentToken()}`
        }
        this.Step()
        this.DecrementIndentation()
        this.push('</varDec>')
        return varCount
    }

    CompileStatements(returnThis){
        this.push("<statements>")
        this.IncrementIndentation()
        while(this.ExactTokenIncluded(['let','if','while','do','return'])){
            if(this.ExactToken('return') && returnThis){
                //this.CW.WritePush('pointer',0)//breaking???
            }
            this.CompileStatement()
        }
        this.DecrementIndentation()
        this.push("</statements>")
    }

    CompileStatement(){
        if(!this.ExactTokenIncluded(['let','if','while','do','return'])){
            throw `Expected statement, instead got ${this.CurrentToken()}`
        }
        switch(true){
            case this.ExactToken('let'):{
                this.CompileLet()
                break;
            }
            case this.ExactToken('if'):{
                this.CompileIf()
                break;
            }
            case this.ExactToken('while'):{
                this.CompileWhile()
                break;
            }
            case this.ExactToken('do'):{
                this.CompileDo()
                break;
            }
            case this.ExactToken('return'):{
                this.CompileReturn()
                break;
            }

        }
    }

    CompileTerm(){//Here identifier is for varName and the first element in subroutine call - subroutineName
        if(!this.XMLIdentifierIncluded(['stringConstant','integerConstant','keyword', 'true', 'false', 'null', 'this', 'identifier']) &&
        !this.ExactTokenIncluded(['-', "~",'('])){
            throw `2Expected term, got ${this.CurrentToken()}`
        }
        this.push("<term>")
        this.IncrementIndentation()
        let callPush = []
        let foundSymbol = this.FindSymbol()
        let args = 0


        if(this.ExactToken('(')){
            this.Step()
            this.CompileExpression(true)//BREAKING
            if(!this.ExactToken(')')){
                throw `Expected term closing ), got ${this.CurrentToken()}`
            }
            this.Step()
        }else if(this.ExactTokenIncluded(['-','~'])){
            const arithOp = this.GetUnwrappedToken()
            this.Step()
            this.CompileTerm()

            if(arithOp){
                this.CW.WriteArithmetic(arithOp)
            }
        }
        else{
            if(this.XMLIdentifier('integerConstant')){
                this.CW.WritePush('constant', this.GetUnwrappedToken())
            }

            if(this.XMLIdentifier('stringConstant')){
                this.CW.WritePush('constant', this.GetUnwrappedToken().length)
                this.CW.WriteCall(["String.new"],1)
                for(let i = 0; i < this.GetUnwrappedToken().length;i++){
                    this.CW.WritePush('constant', this.GetUnwrappedToken().charCodeAt(i))
                    this.CW.WriteCall(["String.appendChar"], 2)                
                }
            }

            if(this.XMLIdentifier('identifier')){
                foundSymbol = this.FindSymbol()
                if(foundSymbol !== undefined){
                    let kind = foundSymbol.kind
                    if(kind === 'field'){
                        kind = 'this'
                    }
                    //console.log(kind, foundSymbol.count, foundSymbol.name, foundSymbol.type)
                    if(foundSymbol.type !== "Array"){
                        this.CW.WritePush(kind, foundSymbol.count)
                    }
                }
            }
            
            if(this.ExactToken('this')){
                this.CW.WritePush('pointer', 0)
            }

            if(this.ExactToken('null')){
                this.CW.WritePush('constant',0)
            }

            if(foundSymbol && foundSymbol.type !== 'int' && foundSymbol.type !== 'char' && foundSymbol.type !== 'boolean'){
                callPush.push(foundSymbol.type)
                args++
            }else{
                callPush.push(this.GetUnwrappedToken())
            }
            this.Step()

            if(foundSymbol && foundSymbol.type === "Array" && !this.ExactToken('[')){
                //field
                this.CW.WritePush(foundSymbol.kind, foundSymbol.count)
            }
        }

        if(this.ExactToken('.')){
            callPush.push(this.GetUnwrappedToken())
            
            this.Step()
            if(!this.XMLIdentifier("identifier")){
                throw `Expected subroutine name, got ${this.CurrentToken()}`
            }
            callPush.push(this.GetUnwrappedToken())

            this.Step()
            if(!this.ExactSymbol('(')){
                throw `1Expected ( , got ${this.CurrentToken()}`
            }
            this.Step()

            args += this.CompileExpressionList()
            if(!this.ExactSymbol(')')){
                throw `1Expected ) , got ${this.CurrentToken()}`
            }
            this.Step()

            //console.log(callPush, args)
            this.CW.WriteCall(callPush, args)
        }

        if(this.ExactToken('[')){
            //steps here
            this.Step()
            this.CompileExpression()//here//righthere
            let pushKind = foundSymbol.kind
            if(pushKind === 'field'){
                pushKind = 'this'
            }
            this.CW.WritePush(pushKind, foundSymbol.count)//breaking
            this.CW.WriteArithmetic("+")
            this.CW.WritePop('pointer',1)
            this.CW.WritePush('that',0)

            //this.CW.WriteArithmetic('+')
            //This is already being handled elsewhere
            if(!this.ExactToken(']')){
                throw `Expected term closing ], got ${this.CurrentToken()}`
            }
            this.Step()
        }//this if used to be 1st if else

        this.DecrementIndentation()
        this.push("</term>")
    }

    FindSymbol(){
        let foundSymbol = this.ScopedSymbolTable[this.GetUnwrappedToken()]
        if(foundSymbol === undefined){
            foundSymbol = this.ClassSymbolTable[this.GetUnwrappedToken()]
        }
        return foundSymbol
    }

    CompileLet(){ //Need to supplement this for conditional
        if(!this.ExactTokenIncluded(['let'])){
            throw `Expected statement, instead got ${this.CurrentToken()}`
        }
        this.push("<letStatement>")
        this.IncrementIndentation()
        this.Step()
        if(!this.XMLIdentifier('identifier')){
            throw `Expected varName identified, got ${this.CurrentToken()}`
        }
        let foundSymbol = this.FindSymbol()
        this.push(`//Symbol use: ${foundSymbol.scope}, ${foundSymbol.name}, ${foundSymbol.type}, ${foundSymbol.kind}, ${foundSymbol.count}`)
        this.Step()
        let popKind = foundSymbol.kind
        let popAddr = foundSymbol.count
        if(popKind === 'field'){
            popKind = 'this'
        }
        let isArr = false
        
        if(this.ExactToken('[')){
            this.Step()
            //console.log("accessing arr")
            this.CompileExpression()
            this.CW.WritePush(popKind, popAddr)
            this.CW.WriteArithmetic('+')
            if(!this.ExactToken(']')){
                throw `Expected ], got ${this.CurrentToken()}`
            }
            this.Step()
            isArr = true
        }

        if(!this.ExactSymbol('=')){
            throw `Expected = , got ${this.CurrentToken()}`
        }
        this.Step()

        this.CompileExpression(true)//BREAKING
        //console.log(popKind, popAddr, foundSymbol.name)
        if(!isArr){
            this.CW.WritePop(popKind, popAddr)//foundSymbol.name
        }else if(isArr){
            this.CW.WritePop('temp',0)
            this.CW.WritePop('pointer',1)
            this.CW.WritePush('temp',0)
            this.CW.WritePop('that',0)
        }
        if(!this.ExactToken(';')){
            throw `expected line end, got ${this.CurrentToken()}`
        }
        this.Step()
        this.DecrementIndentation()
        this.push("</letStatement>")
    }

    CompileIf(){
        if(!this.ExactToken('if')){
            throw `expected if, got ${this.CurrentToken()}`
        }
        this.push("<ifStatement>")
        this.IncrementIndentation()
        this.Step()
        if(!this.ExactToken('(')){
            throw `expected (, got ${this.CurrentToken()}`
        }
        this.Step()
        this.CompileExpression(true)//BREAKING
        
        if(!this.ExactToken(')')){
            throw `expected ), got ${this.CurrentToken()}`
        }
        this.Step()
        if(!this.ExactToken('{')){
            throw `2expected {, got ${this.CurrentToken()}`
        }
        this.Step()
        const label = `IF_${this.ClassName.toUpperCase()}_${this.labelCount}`
        this.labelCount++
        this.CW.WriteIfGoto(`${label}__TRUE`)
        this.CW.WriteGoto(`${label}__FALSE`)
        this.CW.WriteLabel(`${label}__TRUE`)
        if(this.ExactTokenIncluded(['let','if','while','do','return'])){
            this.CompileStatements()
        }
        if(!this.ExactToken('}')){
            throw `expected }, got ${this.CurrentToken()}`
        }
        this.Step()
        this.CW.WriteGoto(`${label}__END`)
        let isElse = false
        if(this.ExactToken("else")){
            this.Step()
            isElse = true
            this.CW.WriteLabel(`${label}__FALSE`)
            if(!this.ExactToken('{')){
                throw `3expected {, got ${this.CurrentToken()}`
            }
            this.Step()
            if(this.ExactTokenIncluded(['let','if','while','do','return'])){
                this.CompileStatements()
            }
            if(!this.ExactToken('}')){
                throw `expected }, got ${this.CurrentToken()}`
            }
            this.Step()
        }

        if(!isElse){
            this.CW.WriteLabel(`${label}__FALSE`)
        }
        this.CW.WriteLabel(`${label}__END`)

        this.DecrementIndentation()
        this.push("</ifStatement>")
    }

    CompileWhile(){
        if(!this.ExactToken('while')){
            throw `Expected statement, instead got ${this.CurrentToken()}`
        }
        const label = `WHILE_${this.ClassName.toUpperCase()}_${this.labelCount}`
        this.labelCount++
        //this.CW.WriteIfGoto(`${label}_START`)
        //this.CW.WriteGoto(`${label}_END`)
        this.CW.WriteLabel(`${label}_START`)
        this.push("<whileStatement>")
        this.IncrementIndentation()
        this.Step()
        if(!this.ExactToken('(')){
            throw `Expected token (, instead got ${this.CurrentToken()}`
        }
        this.Step()
        //Expansion needed
        this.CompileExpression(true)

        if(!this.ExactSymbol(')')){
            throw `Expected while loop expression close ), got ${this.CurrentToken()}`
        }
        this.Step()
        this.CW.WriteArithmetic(`~`)
        this.CW.WriteIfGoto(`${label}_END`)

        if(!this.ExactSymbol('{')){
            throw `4Expected {, got ${this.CurrentToken()}`
        }
        this.Step()

        this.CompileStatements()

        if(!this.ExactSymbol('}')){
            throw `Expected }, got ${this.CurrentToken()}`
        }
        this.Step()
        
        this.CW.WriteGoto(`${label}_START`)
        this.CW.WriteLabel(`${label}_END`)

        this.DecrementIndentation()
        this.push("</whileStatement>")
    }

    CompileDo(){
        if(!this.ExactToken('do')){
            throw `Expected do, got ${this.CurrentToken()}`
        }
        this.push("<doStatement>")
        this.IncrementIndentation()
        this.Step()
        //Expansion needed

        const callContent = []
        let args = 0

        if(!this.XMLIdentifier("identifier")){
            throw `Expected className or varName, got ${this.CurrentToken()}`
        }
        const foundSymbol = this.FindSymbol(this.GetUnwrappedToken())

        if(foundSymbol !== undefined){
            args++
            callContent.push(foundSymbol.type)
        }else{
            callContent.push(this.GetUnwrappedToken())
        }
        this.Step()

        if(foundSymbol !== undefined){
            let kind = foundSymbol.kind
            if(kind === 'field'){
                kind = 'this'
            }

            this.CW.WritePush(kind, foundSymbol.count)//this maybe?
        }
        

        if(this.ExactToken('.')){
            if(!this.ExactToken('.')){
                throw `Expected . , got ${this.CurrentToken()}`
            }
            callContent.push(this.GetUnwrappedToken())
            this.Step()
            if(!this.XMLIdentifier("identifier")){
                throw `Expected subroutine name, got ${this.CurrentToken()}`
            }
            callContent.push(this.GetUnwrappedToken())
            this.Step()


            

            if(!this.ExactSymbol('(')){
                throw `1Expected ( , got ${this.CurrentToken()}`
            }
            this.Step()
            //can catch 1 here
            args += this.CompileExpressionList()//Breaking
            if(!this.ExactSymbol(')')){
                throw `1Expected ) , got ${this.CurrentToken()}`
            }
            this.Step()
        }else if(this.ExactToken('(')){
            if(!this.ExactToken('(')){
                throw `Expected { , got ${this.CurrentToken()}`
            }
            this.Step()
            callContent.unshift(this.ClassName,".")
            this.CW.WritePush('pointer',0)
            args++
            args += this.CompileExpressionList()
            if(!this.ExactToken(')')){
                throw `2Expected ) , got ${this.CurrentToken()}`
            }
            this.Step()
        }else{
            throw `expected subroutine call . or (, got ${this.CurrentToken()}`
        }
        if(!this.ExactToken(';')){
            throw `Expected ; ,got ${this.CurrentToken()}`
        }
        this.Step()

        // if(foundSymbol !== undefined){
        //     let kind = foundSymbol.kind
        //     if(kind === 'field'){
        //         kind = 'this'
        //     }

        //     this.CW.WritePush(kind, foundSymbol.count)//this maybe?
        // }
        //it used to be here

        this.CW.WriteCall(callContent, args)
        this.CW.WritePop('temp', 0)
        this.DecrementIndentation()
        this.push("</doStatement>")
    }

    CompileExpressionList(){
        this.push("<expressionList>")
        this.IncrementIndentation()
        let args = 0
        while(this.XMLIdentifierIncluded(['stringConstant','integerConstant', 'keyword', 'true', 'false', 'null', 'this', 'identifier']) || this.ExactTokenIncluded(['-', '('])){
            args++
            this.CompileExpression(true)
            if(this.ExactSymbol(',')){
                this.Step()
            }
        }
        this.DecrementIndentation()
        this.push("</expressionList>")
        return args
    }
    
    CompileReturn(){
        //needs expansion
        if(!this.ExactToken('return')){
            throw `Expected return statment, got ${this.CurrentToken()}`
        }
        this.push("<returnStatement>")
        this.IncrementIndentation()
        this.Step()
        if(this.XMLIdentifierIncluded(['stringConstant','integerConstant','keyword', 'true', 'false', 'null', 'this', 'identifier']) ||
        this.ExactTokenIncluded(['-', '(','~'])){
            this.CompileExpression()
        }
        if(!this.ExactToken(';')){
            throw `Expected return line end, got ${this.CurrentToken()}`
        }
        this.Step()
        this.DecrementIndentation()
        this.push("</returnStatement>")

        if(this.returnPush === 'void'){
            this.CW.WritePush('constant', 0)
        }

        this.CW.WriteReturn()
    }

    CompileExpression(shouldPush){ //I dont think this is stepping over this
        if(!this.XMLIdentifierIncluded(['stringConstant','integerConstant','keyword', 'true', 'false', 'null', 'this', 'identifier']) &&
        !this.ExactTokenIncluded(['-', '(',"~"])){
            throw `1Expected term, got ${this.CurrentToken()}`
        }
        if(this.ExactTokenIncluded(["true", "false"])){
            this.CW.WritePush("constant", 0)
            if(this.ExactToken("true")){
                this.CW.WriteArithmetic("~")
            }
        }

        this.push("<expression>")
        this.IncrementIndentation()
        this.CompileTerm()
        //Goes here
       
        //RESUME HERE MAYBE
        while(this.ExactTokenIncluded(['+',"-",'*',"/","&","|","<",">","="])){
            let arithmetic = this.GetUnwrappedToken()
            this.Step()
            //This heeds to push the term
            this.CompileTerm()
            if(arithmetic === "-"){
                arithmetic = "sub"
            } 
            this.CW.WriteArithmetic(arithmetic)
        }

        this.DecrementIndentation()
        this.push("</expression>")
    }
    
    CurrentToken(){
        return this.XMLStream[this.currentTokenInd]
    }

    push(input){
        let indentation = ''
        for(let i = 0; i < this.indentationLevel;i++){
            indentation+='  '
        }
        this.structuredXMLStream.push(indentation+input+'\n')
    }

    Step(){
        this.PushToken()
        this.Advance()
    }

    IsType(type){
        if(type.includes(this.GetUnwrappedToken())){
            return true
        }else return false
    }

    ExactToken(token){
        if(this.GetUnwrappedToken() === token){
            return true
        }else return false
    }

    ExactTokenIncluded(tokenArr){
        if(tokenArr.includes(this.GetUnwrappedToken())){
            return true
        }else return false
    }

    ExactSymbol(symbol){
        if(this.GetUnwrappedToken() === symbol){
            return true
        }else{
            return false
        }
    }

    PushToken(){
        this.push(this.CurrentToken())
    }

    XMLIdentifierIncluded(keywordArr){
        const XMLTag = this.CurrentToken().slice(this.CurrentToken().indexOf('<')+1, this.CurrentToken().indexOf('>'))
        if(keywordArr.includes(XMLTag)){
            return true
        }return false
    }

    XMLIdentifier(keyword){
        const XMLTag = this.CurrentToken().slice(this.CurrentToken().indexOf('<')+1, this.CurrentToken().indexOf('>'))
        if(keyword === XMLTag){
            return true
        }else return false
    }

    isObject = function(a) {
        return (!!a) && (a.constructor === Object);
    };

}

export default CompilationEngine

 //all of this might be redundant after them term expansion
        //  if(this.ExactToken('.')){
        //      if(!this.ExactToken('.')){
        //          throw `Expected . , got ${this.CurrentToken()}`
        //      }

        //      this.Step()
        //      if(!this.XMLIdentifier("identifier")){
        //         throw `Expected subroutine name, got ${this.CurrentToken()}`
        //      }
        //       this.Step()
        //      if(!this.ExactSymbol('(')){
        //          throw `1Expected ( , got ${this.CurrentToken()}`
        //      }
        //      this.Step()
        //      if(!this.ExactToken(')')){//added
        //          args = this.CompileExpressionList()
        //      }else{//added
        //         this.push("<expressionList>")
        //         this.push("</expressionList>")
        //      }
        //      if(!this.ExactSymbol(')')){//This is breaking, is it needed?
        //          throw `Expected ) , got ${this.CurrentToken()}`
        //      }
        //      this.Step()
        //  }else if(this.ExactToken('(')){
        //      if(!this.ExactToken('(')){
        //          throw `Expected { , got ${this.CurrentToken()}`
        //      }
        //      this.Step()

        //      this.CompileExpressionList()

        //      if(!this.ExactToken(')')){
        //          throw `Expected ) , got ${this.CurrentToken()}`
        //      }
        //      this.Step()
        //  }

        