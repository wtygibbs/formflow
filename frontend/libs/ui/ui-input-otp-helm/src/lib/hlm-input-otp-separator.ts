import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMinus } from '@ng-icons/lucide';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { hlm } from '@spartan-ng/helm/utils';
import type { ClassValue } from 'clsx';

@Component({
	selector: 'hlm-input-otp-separator',
	imports: [HlmIcon, NgIcon],
	providers: [provideIcons({ lucideMinus })],
	template: `
		<ng-icon hlm name="lucideMinus" />
	`,
	host: {
		role: 'separator',
		'[class]': '_computedClass()',
	},
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HlmInputOtpSeparator {
	public readonly userClass = input<ClassValue>('inline-flex', { alias: 'class' });

	protected readonly _computedClass = computed(() => hlm(this.userClass()));
}
