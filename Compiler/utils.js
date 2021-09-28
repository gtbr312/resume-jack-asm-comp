export function cleanLine(line){
    let cleanedLine = line.trim()
    let commentInd = cleanedLine.indexOf("//")
    if(commentInd === -1){
        commentInd = cleanedLine.indexOf("/*")
    }
    if(commentInd != -1){
        cleanedLine = cleanedLine.slice(0,commentInd).trim()
    }
    if(cleanedLine.length < 1)return null
    return cleanedLine
}