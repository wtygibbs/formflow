import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { hlm } from '@spartan-ng/helm/utils';
import type { ClassValue } from 'clsx';

@Component({
	selector: 'hlm-radio-indicator',
	host: {
		'[class]': '_computedClass()',
	},
	template: `
		<div class="group-data-[checked=true]:bg-primary size-2 rounded-full bg-transparent"></div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HlmRadioIndicator {
	public readonly userClass = input<ClassValue>('', { alias: 'class' });
	protected readonly _computedClass = computed(() =>
		hlm(
			'border-input text-primary group-has-[:focus-visible]:border-ring group-has-[:focus-visible]:ring-ring/50 dark:bg-input/30 shadow-xs group-data=[disabled=true]:cursor-not-allowed group-data=[disabled=true]:opacity-50 relative flex aspect-square size-4 shrink-0 items-center justify-center rounded-full border outline-none transition-[color,box-shadow] group-has-[:focus-visible]:ring-[3px]',
			this.userClass(),
		),
	);
}
