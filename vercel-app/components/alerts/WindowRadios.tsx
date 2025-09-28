import { Tier } from '@/lib/tier/useTier';
import { WindowCategory } from '@/lib/alerts/useWindowCategories';

interface WindowRadiosProps {
  tier: Tier;
  categories: WindowCategory[];
  value: number;
  onChange: (value: number) => void;
}

export default function WindowRadios({ tier, categories, value, onChange }: WindowRadiosProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-slate-900 mb-3">
          Forecast Window
        </label>
        <p className="text-sm text-slate-600 mb-4">
          Choose how far ahead to look for surf conditions
        </p>
      </div>
      
      <div className="space-y-3">
        {categories.map((category) => {
          const isDisabled = category.proOnly && (tier === 'free');
          const isSelected = value === category.value;
          
          return (
            <div key={category.id} className="relative">
              <label
                className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                    : isDisabled
                    ? 'border-slate-200 bg-slate-50 cursor-not-allowed'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="forecastWindow"
                  value={category.value}
                  checked={isSelected}
                  onChange={() => onChange(category.value)}
                  disabled={isDisabled}
                  className="sr-only"
                />
                
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`font-semibold ${
                        isDisabled ? 'text-slate-400' : 'text-slate-900'
                      }`}>
                        {category.label}
                      </div>
                      <div className={`text-sm ${
                        isDisabled ? 'text-slate-400' : 'text-slate-600'
                      }`}>
                        {category.subtitle}
                      </div>
                    </div>
                    
                    {isDisabled && (
                      <div className="flex items-center gap-2 text-slate-400">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs font-medium">PRO</span>
                      </div>
                    )}
                  </div>
                </div>
              </label>
              
              {isDisabled && (
                <div className="absolute -bottom-1 left-0 transform translate-y-full z-10">
                  <div className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap">
                    Pro unlocks longer forecast windows (6–10 & 11–16 days).
                    <div className="absolute top-0 left-4 transform -translate-y-1 w-2 h-2 bg-slate-900 rotate-45"></div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
