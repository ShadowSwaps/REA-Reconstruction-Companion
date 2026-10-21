// Proposed catalog-v1 profile; synchronous, in-memory, valid fixture inputs only.
const fold = text => text.replace(/[A-Z]/g, letter => letter.toLowerCase());
const queryKey = text => fold(text.replace(/^ +| +$/g, ''));
const textOrder = (a, b) => a < b ? -1 : a > b ? 1 : 0;

export function createCatalog(initial, pageSize = 3) {
  let rows = structuredClone(initial), page = 0, selectedId = null;
  let view = {query:'', kinds:[], active:null, maxPrice:null, sort:'source'};
  function ordered() {
    const query = queryKey(view.query);
    const matches = rows.filter(row => {
      const tests = [fold(row.title).includes(query),
        view.kinds.length === 0 || view.kinds.includes(row.kind),
        view.active === null || row.active === view.active,
        view.maxPrice === null || (row.price != null && row.price <= view.maxPrice)];
      return tests.every(Boolean);
    });
    return matches.sort((a, b) => {
      if (view.sort === 'source') return 0;
      if (view.sort === 'titleAsc') return textOrder(a.title, b.title);
      if (a.price == null || b.price == null) return a.price == null ? (b.price == null ? 0 : 1) : -1;
      const delta = a.price - b.price;
      return view.sort === 'priceDesc' ? -delta : delta;
    });
  }
  function snapshot() {
    const order = ordered().map(row => row.id);
    page = Math.max(0, Math.min(page, Math.max(0, Math.ceil(order.length / pageSize) - 1)));
    const visible = order.slice(page * pageSize, (page + 1) * pageSize);
    return {order, page, visible, selected:selectedId, shown:visible.includes(selectedId)};
  }
  function dispatch(action) {
    switch (action.type) {
      case 'view':
        view = {...view, ...action.value};
        page = 0;
        break;
      case 'page': page = action.value; break;
      case 'select': {
        const visible = snapshot().visible;
        if (!Number.isInteger(action.index) || action.index < 0 || action.index >= visible.length) throw new RangeError('selection');
        selectedId = visible[action.index];
        break;
      }
      case 'add':
        if (rows.some(row => row.id === action.row.id)) throw new RangeError('duplicate identity');
        rows.push(structuredClone(action.row));
        break;
      case 'remove':
        rows = rows.filter(row => row.id !== action.id);
        if (selectedId === action.id) selectedId = null;
        break;
      default: throw new RangeError('unsupported action');
    }
    return snapshot();
  }
  return {dispatch, snapshot, data:() => structuredClone(rows)};
}
