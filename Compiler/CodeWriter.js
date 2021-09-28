class CodeWriter{
    constructor(output){
        this.output = output
    }

    SetClassName(name){
        this.className = name
    }

    WritePush(segment, val){
        this.write(`push ${segment} ${val}`)
    }

    WritePop(segment, val, info){
        if(info)
        this.write(`pop ${segment} ${val} //${info}`)
        else
        this.write(`pop ${segment} ${val}`)
    }

    WriteArithmetic(operator){

        switch(operator){
            case "*":{
                this.write(`call Math.multiply 2`)
                break;
            }
            case "+":{
                this.write("add")
                break;
            }
            case "-":{
                this.write("neg")
                break;
            }
            case "sub":{
                this.write("sub")
                break;
            }
            case "~":{
                this.write("not")
                break;
            }
            case "<":{
                this.write("lt")
                break;
            }
            case ">":{
                this.write("gt")
                break;
            }
            case "=":{
                this.write("eq")
                break;
            }
            case "&":{
                this.write("and")
                break;
            }
            case "/":{
                this.WriteCall(["Math.divide"],2)
                break;
            }
            case "|":{
                this.write("or");
                break;
            }
        }
    }

    WriteLabel(label){
        this.write("label "+ label)
    }

    WriteGoto(destination){
        this.write(`goto ${destination}`)
    }

    WriteIfGoto(destination){
        this.write(`if-goto ${destination}`)
    }

    WriteIf(){

    }

    WriteCall(callContent, args){
        let call = ''

        callContent.forEach(element => {
            call += element;
        });

        call += ` ${args}`
        this.write(`call ${call}`)
    }
    
    WriteFunction(funcName, argCount){
      this.write(`function ${this.className}.${funcName} ${argCount}`);  
    }

    WriteReturn(){
        this.write("return")
    }

    write(content){
        this.output.write(content + "\n")
    }

}

export default CodeWriter