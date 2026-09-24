import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { InspectorPanel } from './InspectorPanel';
import { useAppStore } from '../store/appStore';

describe('InspectorPanel component', () => {
  beforeEach(() => {
    useAppStore.getState().resetToDefault();
    vi.restoreAllMocks();
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('renders entity properties when an entity is selected', () => {
    useAppStore.getState().selectEntity('customer');

    render(<InspectorPanel />);

    const propertiesHeader = screen.getByText(/Properties \(\d+\)/i);
    const propertiesSection = propertiesHeader.closest('.inspector-section');
    expect(propertiesSection).toBeTruthy();

    const propertyInList = within(propertiesSection as HTMLElement).getByText('name');
    expect(propertyInList).toBeTruthy();
  });

  it('renders data bindings when data bindings are toggled on', () => {
    useAppStore.getState().selectEntity('customer');
    useAppStore.setState({ showDataBindings: true });

    render(<InspectorPanel />);

    const bindingsHeader = screen.getByText('Data Bindings');
    const bindingsSection = bindingsHeader.closest('.inspector-section');
    expect(bindingsSection).toBeTruthy();

    const mappedColumn = within(bindingsSection as HTMLElement).getByText('full_name');
    expect(mappedColumn).toBeTruthy();
  });
});
