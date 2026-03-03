import { Injectable } from '@nestjs/common';


@Injectable()
export class RoundingService {
round(amount: number, decimals = 2) {
const factor = Math.pow(10, decimals);
return Math.round((amount + Number.EPSILON) * factor) / factor;
}
}