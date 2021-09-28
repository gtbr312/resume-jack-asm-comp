export const LexicalElements = {
    keyword:[
        'class',
        'constructor',
        'function',
        'method',
        'field',
        'static',
        'var',
        'int',
        'char',
        'boolean',
        'void',
        'true',
        'false',
        'null',
        'this',
        'let',
        'do',
        'if',
        'else',
        'while',
        'return'
    ],
    symbol:[
        '{',
        '}',
        '(',
        ')',
        '[',
        ']',
        '.',
        ',',
        ';',
        '+',
        '-',
        '*',
        '/',
        '&',
        '|',
        '<',
        '>',
        '=',
        '~',
        `"`
    ],
    integerConstant:'integerConstant',
    StringConstant:'stringConstant',
    identifier:'identifier'
}

export const JackLexicalElements = {
    keyword:'keyword',
    symbol:'symbol',
    integerConstant:'integerConstant',
    StringConstant:'StringConstant',
    identifier:'identifier'
}




export const subroutineName = [JackLexicalElements.identifier]

export const className = [JackLexicalElements.identifier]

export const varName = [JackLexicalElements.identifier]

export const type = [['int', 'char', 'boolean', className]]

export const parameterList = [ type, varName ]

export const classVarDec = [ ['static', 'field'], type, varName, [',', varName], ';' ]

export const subroutineDec = [ [ 'constructor', 'function', 'method'], ['void', type], subroutineName, '(', parameterList, ')']

export const jackClass = ['class', {type:className, XMLKey:'identifier'}, '{', true, {type:classVarDec}, subroutineDec, '}']

