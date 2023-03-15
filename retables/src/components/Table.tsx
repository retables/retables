// React
import { forwardRef, Ref, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { TableConfig } from '../types/table';

// Components
import useOrder from '../hooks/useOrder';
import { SORT_DIRECTION } from '../types/enums';
import { getByString } from '../utils/objects';
import TableFull from './TableFull';

// Styles
import TableMin from './TableMin';
import { compareBreakpoints, getBreakpointFromWidth } from '../utils/spacing';
import { DEFAULT_BREAKPOINT } from '../config/constants';

export type TableRef = {
    getSelectedKeys: () => any[];
    getCurrentPage: () => number;
    setPage: (page: number) => void;
};

function Table<T = any>(props: TableConfig<T>, ref: Ref<TableRef>) {
    // Hooks
    const { columnOrder, setColumnOrder, getColumnOrder } = useOrder<T>();

    // State
    const [page, setPage] = useState(0);
    const [areColumnCollapsed, setAreColumnCollapsed] = useState(
        compareBreakpoints(
            props.breakpoint ?? DEFAULT_BREAKPOINT,
            getBreakpointFromWidth(window.innerWidth),
            true
        )
    );
    const [checkedKeys, setCheckedKeys] = useState(props.selectionConfig?.initialSelection || []);

    // References
    const checkedKeysRef = useRef<any[]>(checkedKeys);

    // Memos
    const orderedData = useMemo<T[]>(() => {
        if (columnOrder && props.data) {
            const columnKey = columnOrder.key;
            const or = getColumnOrder(columnKey);
            const column = props.columnConfigs!.find(c => c.key === columnKey)!;

            let ordered = [...props.data].sort((a: any, b: any) => {
                if (column?.compare) return column.compare(a, b);
                if (getByString(a, columnKey as string) < getByString(b, columnKey as string)) 1;
                else if (getByString(a, columnKey as string) > getByString(b, columnKey as string))
                    return -1;
                return 0;
            });

            if (or === SORT_DIRECTION.ASC) ordered = ordered.reverse();

            return ordered;
        } else if (props.data) return props.data;
        return [];
    }, [props.columnConfigs, columnOrder, props.data]);

    const paginatedData = useMemo<T[]>(() => {
        return props.paginationConfig
            ? orderedData.slice(
                  props.paginationConfig.entryPerPage * page,
                  props.paginationConfig.entryPerPage * (page + 1)
              )
            : orderedData;
    }, [orderedData, page, props.paginationConfig]);

    const allKeysChecked = useMemo(() => {
        if (!paginatedData.length) return false;
        const allKeys = paginatedData.map(p => getByString(p, props.indexKey));
        return allKeys.every(v => checkedKeys.includes(v));
    }, [paginatedData, checkedKeys]);

    // Methods
    const onSelectionChange = (key: any, globalSwitch?: boolean) => {
        if (globalSwitch !== undefined) {
            checkedKeysRef.current = globalSwitch
                ? paginatedData.map(p => getByString(p, props.indexKey))
                : [];
        } else {
            if (checkedKeysRef.current.includes(key))
                checkedKeysRef.current = checkedKeysRef.current.filter(k => k !== key);
            else checkedKeysRef.current = [...checkedKeysRef.current, key];
        }
        setCheckedKeys([...checkedKeysRef.current]);
    };

    const changePage = (nextPage: number) => {
        if (page !== nextPage) {
            setPage(nextPage);
            setCheckedKeys([]);
            checkedKeysRef.current = [];
        }
    };

    // Handles
    useImperativeHandle(ref, () => ({
        getSelectedKeys: () => checkedKeys,
        getCurrentPage: () => page,
        setPage: (page: number) => {
            setPage(page);
            setCheckedKeys([]);
            checkedKeysRef.current = [];
        }
    }));

    // Effects
    useEffect(() => {
        setPage(0);
    }, [columnOrder]);

    // Methods
    const calcInnerWidth = () => {
        const isCollapsed = compareBreakpoints(
            props.breakpoint ?? DEFAULT_BREAKPOINT,
            getBreakpointFromWidth(window.innerWidth),
            true
        );
        setAreColumnCollapsed(isCollapsed);
    };

    // Effects
    useEffect(() => {
        window.addEventListener('resize', calcInnerWidth);
        return () => window.removeEventListener('resize', calcInnerWidth);
    }, []);

    // Render
    return (
        <>
            {areColumnCollapsed ? (
                <TableMin
                    {...props}
                    data={props.data ? paginatedData : undefined}
                    columnConfigs={props.columnConfigs}
                    columnOrder={columnOrder}
                    orderIconsConfig={props.orderIconsConfig}
                    checkedKeys={checkedKeys}
                    setColumnOrder={setColumnOrder}
                    onCellPress={props.onCellPress}
                    onSelectionChange={onSelectionChange}
                />
            ) : (
                <TableFull
                    {...props}
                    data={props.data ? paginatedData : undefined}
                    columnConfigs={props.columnConfigs}
                    columnOrder={columnOrder}
                    orderIconsConfig={props.orderIconsConfig}
                    checkedKeys={checkedKeys}
                    setColumnOrder={setColumnOrder}
                    onCellPress={props.onCellPress}
                    onSelectionChange={onSelectionChange}
                    allKeysChecked={allKeysChecked}
                />
            )}
            {props.paginationConfig && props.data?.length && (
                <props.paginationConfig.renderer
                    nPages={
                        props.data.length % props.paginationConfig.entryPerPage === 0
                            ? props.data.length / props.paginationConfig.entryPerPage
                            : Math.trunc(props.data.length / props.paginationConfig.entryPerPage) +
                              1
                    }
                    currentPage={page}
                    setPage={changePage}
                />
            )}
        </>
    );
}

export default forwardRef(Table) as <T extends unknown>(
    props: TableConfig<T> & {
        ref?: Ref<TableRef>;
    }
) => JSX.Element;