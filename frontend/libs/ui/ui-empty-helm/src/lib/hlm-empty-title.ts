import { computed, Directive, input } from '@angular/core';
import { hlm } from '@spartan-ng/helm/utils';
import type { ClassValue } from 'clsx';

@Directive({
	selector: '[hlmEmptyTitle]',
	host: {
		'data-slot': 'empty-title',
		'[class]': '_computedClass()',
	},
})
export class HlmEmptyTitle {
	public readonly userClass = input<ClassValue>('', { alias: 'class' });

	protected readonly _computedClass = computed(() => hlm('text-lg font-medium tracking-tight', this.userClass()));
}
