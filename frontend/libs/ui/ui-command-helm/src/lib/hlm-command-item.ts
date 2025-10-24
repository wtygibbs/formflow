import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BrnCommandItem } from '@spartan-ng/brain/command';
import { hlm } from '@spartan-ng/helm/utils';

@Component({
	selector: 'button[hlm-command-item]',
	template: `
		<ng-content />
	`,
	hostDirectives: [
		{
			directive: BrnCommandItem,
			inputs: ['value', 'disabled', 'id'],
			outputs: ['selected'],
		},
	],
	host: {
		'[class]': '_computedClass()',
	},
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HlmCommandItem {
	/** The user defined class  */
	public readonly userClass = input<string>('', { alias: 'class' });

	/** The styles to apply  */
	protected readonly _computedClass = computed(() =>
		hlm(
			'data-[selected]:bg-accent data-[selected=true]:text-accent-foreground [&>ng-icon]:text-muted-foreground outline-hidden relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm data-[disabled]:pointer-events-none data-[hidden]:hidden data-[disabled]:opacity-50 [&>ng-icon]:pointer-events-none [&>ng-icon]:shrink-0 [&>ng-icon]:text-base',
			this.userClass(),
		),
	);
}
