import { Injectable } from '@nestjs/common';


@Injectable()
export class CurrencyService {
// placeholder FX service - extend to call real FX provider
async convert(amount: number, from: string, to: string, rate?: number) {
if (from === to) return amount;
if (rate) return amount * rate;
// naive: 1:1 fallback
return amount;
}
}