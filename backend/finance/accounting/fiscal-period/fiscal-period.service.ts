import { Injectable, BadRequestException } from '@nestjs/common';


export interface FiscalPeriod { id: string; start: Date; end: Date; closed: boolean; name?: string }


@Injectable()
export class FiscalPeriodService {
private periods: FiscalPeriod[] = [];


createPeriod(start: Date, end: Date, name?: string) {
if (end < start) throw new BadRequestException('end < start');
const p = { id: String(Date.now()), start, end, closed: false, name } as FiscalPeriod;
this.periods.push(p);
return p;
}


list() {
return this.periods.slice().sort((a, b) => a.start.getTime() - b.start.getTime());
}


close(id: string) {
const p = this.periods.find(x => x.id === id);
if (!p) throw new BadRequestException('period not found');
p.closed = true;
return p;
}
}