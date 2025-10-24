import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BrnCommandList } from '@spartan-ng/brain/command';
import { hlm } from '@spartan-ng/helm/utils';

@Component({
	selector: 'hlm-command-list',
	template: '<ng-content />',
	host: {
		'[class]': '_computedClass()',
	},
	hostDirectives: [
		{
			directive: BrnCommandList,
			inputs: ['id'],
		},
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HlmCommandList {
	/** The user defined class  */
	public readonly userClass = input<string>('', { alias: 'class' });

	/** The styles to apply  */
	protected readonly _computedClass = computed(() =>
		hlm('max-h-[300px] overflow-y-auto overflow-x-hidden', this.userClass()),
	);
}
