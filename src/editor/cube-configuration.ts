export function assertInteractiveCube(sideLengthMeters:number,cellsPerEdge:number){
 if(!Number.isFinite(sideLengthMeters)||sideLengthMeters<1||sideLengthMeters>1_000_000_000)throw RangeError('Cube edge length must be 1–1,000,000,000 meters.');
 if(cellsPerEdge!==128&&cellsPerEdge!==256)throw RangeError('Select cube N128 or N256.');
}
