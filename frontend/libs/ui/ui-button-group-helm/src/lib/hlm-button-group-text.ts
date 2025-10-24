import { computed, Directive, input } from '@angular/core';
import { hlm } from '@spartan-ng/helm/utils';
import { ClassValue } from 'clsx';

@Directive({
	selector: '[hlmButtonGroupText]',
	host: {
		'[class]': '_computedClass()',
	},
})
export class HlmButtonGroupText {
	public readonly userClass = input<ClassValue>('', { alias: 'class' });

	protected readonly _computedClass = computed(() =>
		hlm(
			"bg-muted shadow-xs flex items-center gap-2 rounded-md border px-4 text-sm font-medium [&_ng-icon:not([class*='size-'])]:size-4 [&_ng-icon]:pointer-events-none",
			this.userClass(),
		),
	);
}
