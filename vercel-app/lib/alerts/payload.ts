import { type Tier } from '../tier/useTier';

export type FormValues = {
	name: string;
	spotId: string | null;
	originIata: string;
	destIata: string | null;
	minNights: number;
	maxNights: number;
	daysMask: number;          // e.g. 127
	windowDays: 5 | 10 | 16;   // radios -> 5/10/16
	// Pro-only (all optional):
	waveMin?: number;
	waveMax?: number;
	windMax?: number;
	maxPrice?: number;
	planningLogic?: string;    // conservative, optimistic, aggressive
};

export function buildAlertPayload(values: FormValues, tier: Tier) {
	const base: Record<string, any> = {
		mode: 'spot',
		name: values.name || 'Surf Alert',
		spot_id: values.spotId,
		origin_iata: values.originIata?.toUpperCase(),
		dest_iata: values.destIata?.toUpperCase() ?? null,
		min_nights: values.minNights,
		max_nights: values.maxNights,
		days_mask: values.daysMask,
		forecast_window: values.windowDays,
		is_active: true,
	};

	if (tier === 'pro') {
		if (values.waveMin != null) base.wave_min_m = Number(values.waveMin) ?? null;
		if (values.waveMax != null) base.wave_max_m = Number(values.waveMax) ?? null;
		if (values.windMax != null) base.wind_max_kmh = Number(values.windMax) ?? null;
		if (values.maxPrice != null) base.max_price_eur = values.maxPrice;
		if (values.planningLogic != null) base.planning_logic = values.planningLogic;
	}
	// Free: do not attach pro-only keys; trigger also enforces.
	return base;
}
