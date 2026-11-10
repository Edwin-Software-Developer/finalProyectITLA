import { Component, input } from '@angular/core';
import {
  LucideArrowDownRight,
  LucideArrowUpRight,
  LucideCircleHelp,
  LucideDynamicIcon,
  LucideIcon,
} from '@lucide/angular';

@Component({
  selector: 'app-metric-card',
  imports: [LucideArrowDownRight, LucideArrowUpRight, LucideCircleHelp, LucideDynamicIcon],
  styles: [':host { display: contents; }'],
  template: `
    <article class="metric-card">
      <div class="metric-top">
        <div class="metric-icon" [class]="'metric-icon-' + tone()">
          <svg [lucideIcon]="icon()" [size]="18" [strokeWidth]="2"></svg>
        </div>
        <button [attr.aria-label]="'Más información: ' + label()" class="metric-info">
          <svg lucideCircleHelp [size]="15"></svg>
        </button>
      </div>
      <p class="metric-label">{{ label() }}</p>
      <div class="metric-value-row">
        <h2>{{ value() }}</h2>
        <span class="metric-change" [class.change-down]="trend() === 'down'">
          @if (trend() === 'down') {
            <svg lucideArrowDownRight [size]="14"></svg>
          } @else {
            <svg lucideArrowUpRight [size]="14"></svg>
          }
          {{ change() }}
        </span>
      </div>
      <p class="metric-detail">{{ detail() }}</p>
    </article>
  `,
})
export class MetricCard {
  readonly icon = input.required<LucideIcon>();
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly change = input.required<string>();
  readonly detail = input.required<string>();
  readonly tone = input.required<'blue' | 'green' | 'orange' | 'purple'>();
  readonly trend = input<'up' | 'down'>('up');
}
