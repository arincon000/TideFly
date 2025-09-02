import { type Tier } from '../tier/normalizeTier';

export type PlanTier = Tier;

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
};

export function buildAlertPayload(values: FormValues, tier: PlanTier) {
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
		if (values.waveMin != null) base.min_wave_m = values.waveMin;  // correct key
		if (values.waveMax != null) base.wave_max_m = values.waveMax;  // correct key
		if (values.windMax != null) base.max_wind_kmh = values.windMax;  // correct key
		if (values.maxPrice != null) base.max_price_eur = values.maxPrice;
	}
	// Free: do not attach pro-only keys; trigger also enforces.
	return base;
}
