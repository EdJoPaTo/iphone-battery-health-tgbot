import type { Context as BaseContext, SessionFlavor } from "grammy";
import type { Device, IsoDate } from "./data.ts";

export type Session = {
	page?: number;

	device?: Device;
	age?: IsoDate;
};

export type State = {
	owner: string;
};

export type MyContext = BaseContext & SessionFlavor<Session> & { state: State };
