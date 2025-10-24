import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BrnCommandGroup } from '@spartan-ng/brain/command';
import { hlm } from '@spartan-ng/helm/utils';

@Component({
	selector: 'hlm-command-group',
	template: '<ng-content />',
	hostDirectives: [
		{
			directive: BrnCommandGroup,
			inputs: ['id'],
		},
	],
	host: {
		'[class]': '_computedClass()',
	},
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HlmCommandGroup {
	/** The user defined class  */
	public readonly userClass = input<string>('', { alias: 'class' });

	/** The styles to apply  */
	protected readonly _computedClass = computed(() =>
		hlm('text-foreground block overflow-hidden p-1 data-[hidden]:hidden', this.userClass()),
	);
}
