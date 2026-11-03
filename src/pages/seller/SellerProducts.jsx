import { useState, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Search, X, Eye, Copy, ImagePlus } from 'lucide-react';
import { productsOfStore, productById, categories, catById } from '../../data/catalog';
import { useApp } from '../../lib/store';
import { PageHead, Segments, StatusPill, Checkbox, Pager, Modal, Price } from '../../components/ui';
import { won, comma, ymd, salePrice, cx } from '../../lib/format';
import { MY_STORE } from './SellerLayout';

/* ─────────── 상품 조회/수정 ─────────── */
// 재고 수정 모달 — 옵션 조합별 지금 재고 → 바꿀 재고 (실제: 상세를 읽어 옵션별 재고)
function stockRowsOf(p) {
  const lists = p.options.map((o) => o.values);
  const cbs = lists.length ? lists.reduce((acc, l) => acc.flatMap((a) => l.map((v) => [...a, v])), [[]]) : [[]];
  return cbs.map((cb, i) => ({ label: cb.length ? cb.join(' / ') : '옵션 없음', stock: Math.max(0, Math.round(p.stock / cbs.length) - (i % 3) * 4) }));
}
function StockModal({ p, onClose, onSave }) {
  const [edited, setEdited] = useState({});
  if (!p) return null;
  const opts = stockRowsOf(p);
  return (
    <Modal open onClose={onClose} title="재고 수정" width={480}>
      <p className="text-[13px] font-medium mb-3">{p.name}</p>
      <table className="tbl">
        <thead><tr><th>옵션</th><th className="w-24 text-right">지금 재고</th><th className="w-28">바꿀 재고</th></tr></thead>
        <tbody>
          {opts.map((o, i) => (
            <tr key={o.label}>
              <td>{o.label}</td>
              <td className="text-right num">{o.stock}</td>
              <td><input className="field field-sm num" value={edited[i] ?? o.stock} onChange={(e) => setEdited({ ...edited, [i]: Number(e.target.value.replace(/\D/g, '')) })} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[12px] text-mute mt-3">재고가 0이면 품절로 보이고, 다시 채우면 판매가 이어져요.</p>
      <div className="flex justify-end gap-2 mt-4">
        <button className="btn btn-line btn-sm" onClick={onClose}>취소</button>
        <button className="btn btn-ink btn-sm" onClick={() => onSave(Object.keys(edited).length ? opts.reduce((a, o, i) => a + (edited[i] ?? o.stock), 0) : null)}>저장</button>
      </div>
    </Modal>
  );
}

export function SellerProductList() {
  const { toast } = useApp();
  const [rows, setRows] = useState(() => productsOfStore(MY_STORE.id).map((p) => ({ ...p })));
  const [status, setStatus] = useState('전체');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(new Set());
  const [del, setDel] = useState(false);
  const [stockId, setStockId] = useState(null); // 재고 수정 모달을 연 상품

  const counts = { 전체: rows.length, 판매중: 0, 품절: 0, 판매중지: 0 };
  rows.forEach((r) => counts[r.status]++);
  const list = rows.filter((r) => (status === '전체' || r.status === status) && `${r.name} ${catById[r.cat].name} ${r.sub} ${r.status}`.includes(q));
  const allOn = list.length > 0 && list.every((r) => sel.has(r.id));
  // 건마다 결과 — 관리자 강제중지 상품은 재개 실패로 선택에 남김. 재고 0 상품은 재개해도 품절로 보임
  const bulk = (st) => {
    const failed = rows.filter((r) => sel.has(r.id) && r.blocked);
    const okRows = rows.filter((r) => sel.has(r.id) && !r.blocked);
    const verb = st === '판매중' ? '판매재개했어요' : '판매중지했어요';
    const soldOut = st === '판매중' ? okRows.filter((r) => r.stock === 0).length : 0;
    setRows(rows.map((r) => (sel.has(r.id) && !r.blocked ? { ...r, status: st === '판매중' && r.stock === 0 ? '품절' : st } : r)));
    const head = failed.length ? `${okRows.length}개 ${verb} · ${failed.length}개 실패 — 관리자가 판매중지한 상품은 재개할 수 없어요`
      : soldOut > 0 && soldOut === okRows.length ? verb : `${okRows.length}개 상품을 ${verb}`;
    if (!soldOut) toast(head);
    else toast(soldOut === okRows.length ? `${head}. 재고가 0이라 품절로 보여요 — 「재고」에서 채워 주세요` : `${head}. 그중 ${soldOut}개는 재고가 0이라 품절로 보여요`);
    setSel(new Set(failed.map((r) => r.id)));
  };
  const toggle = (id) => { const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); setSel(n); };
  const saveStock = (total) => {
    if (total == null) return toast('바뀐 재고가 없어요');
    setRows(rows.map((r) => (r.id === stockId ? { ...r, stock: total, status: r.status === '판매중지' ? r.status : total ? '판매중' : '품절' } : r)));
    toast('재고를 저장했어요');
    setStockId(null);
  };

  return (
    <div>
      <PageHead title="상품 조회/수정" desc="판매중지 상품은 쇼핑몰에 노출되지 않습니다. 재고가 0이 되면 자동으로 품절 처리됩니다."
        right={<Link to="/seller/products/new" className="btn btn-ink btn-sm">+ 상품 등록</Link>} />

      <div className="panel p-4 flex flex-wrap items-center gap-3">
        <Segments items={['전체', '판매중', '품절', '판매중지']} value={status} onChange={setStatus} counts={counts} />
        <div className="flex items-center border border-line-2 h-9 px-2.5 ml-auto w-full sm:w-72 bg-white">
          <Search size={15} className="text-mute" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="상품명 · 카테고리 · 상태 검색" className="flex-1 px-2 text-[13px] outline-none" />
        </div>
      </div>

      <div className="panel mt-3">
        <div className="flex flex-wrap items-center gap-2 px-4 h-12 border-b border-line text-[13px]">
          <Checkbox checked={allOn} onChange={(on) => setSel(on ? new Set(list.map((r) => r.id)) : new Set())} />
          <span className="text-ink-2 mr-2">선택 <b className="num text-ink">{sel.size}</b>개</span>
          <button disabled={!sel.size} onClick={() => bulk('판매중')} className="btn btn-line btn-xs">판매재개</button>
          <button disabled={!sel.size} onClick={() => bulk('판매중지')} className="btn btn-line btn-xs">판매중지</button>
          <button disabled={!sel.size} onClick={() => setDel(true)} className="btn btn-line btn-xs text-rust">삭제</button>
          <span className="ml-auto text-mute">총 {list.length}건</span>
        </div>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th className="w-10"></th>
                <th>상품</th><th>카테고리</th><th className="text-right">판매가</th><th className="text-right">할인가</th><th className="text-right">재고</th><th>상태</th><th>평점</th><th>등록일</th><th className="text-center">관리</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td><Checkbox checked={sel.has(p.id)} onChange={() => toggle(p.id)} /></td>
                  <td>
                    <div className="flex items-center gap-3 min-w-[260px]">
                      <img src={p.images[0]} alt="" className="w-11 h-11 object-cover" />
                      <div><Link to={`/seller/products/${p.id}/edit`} className="font-medium hover:underline">{p.name}</Link><div className="text-[11.5px] text-mute num">상품번호 {p.id.toUpperCase()}</div></div>
                    </div>
                  </td>
                  <td className="text-ink-2 whitespace-nowrap">{catById[p.cat].name} &gt; {p.sub}</td>
                  <td className="text-right num">{comma(p.price)}</td>
                  <td className="text-right num">{p.discount ? <><span className="text-point">{Math.round(p.discount * 100)}%</span> {comma(salePrice(p))}</> : '-'}</td>
                  <td className={cx('text-right num', p.stock < 20 && 'text-rust font-bold')}>{comma(p.stock)}</td>
                  <td className="whitespace-nowrap">
                    <StatusPill s={p.blocked ? '강제중지' : p.status} />
                    {p.blocked && p.statusReason && <div className="text-[11.5px] text-rust mt-1 max-w-[180px] whitespace-normal">사유: {p.statusReason}</div>}
                  </td>
                  <td className="whitespace-nowrap">★ {p.rating} <span className="text-mute num">({comma(p.reviews)})</span></td>
                  <td className="num text-ink-2">{ymd(p.created)}</td>
                  <td>
                    <div className="flex gap-1 justify-center">
                      <Link to={`/seller/products/${p.id}/edit`} className="btn btn-line btn-xs">수정</Link>
                      <button onClick={() => setStockId(p.id)} className="btn btn-line btn-xs">재고</button>
                      <Link to={`/products/${p.id}`} className="btn btn-ghost btn-xs px-1.5" title="쇼핑몰에서 보기"><Eye size={14} /></Link>
                      <button onClick={() => toast('판매중지 상태로 복사했어요. 재고를 채운 뒤 판매를 시작하세요')} className="btn btn-ghost btn-xs px-1.5" title="복사"><Copy size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager total={1} className="py-4" />
      </div>

      <StockModal key={stockId} p={rows.find((r) => r.id === stockId)} onClose={() => setStockId(null)} onSave={saveStock} />
      <Modal open={del} onClose={() => setDel(false)} title="상품 삭제" width={420}
        footer={<><button className="btn btn-line btn-sm" onClick={() => setDel(false)}>취소</button><button className="btn btn-sm bg-rust text-white border-rust" onClick={() => { setRows(rows.filter((r) => !sel.has(r.id))); toast(`${sel.size}개 상품을 삭제했어요`); setSel(new Set()); setDel(false); }}>삭제</button></>}>
        <p className="text-[14px]">선택한 <b>{sel.size}개</b> 상품을 삭제할까요?</p>
        <p className="text-[13px] text-mute mt-2">삭제한 상품은 쇼핑몰 · 장바구니에서 구매할 수 없게 돼요. 지난 주문과 리뷰는 그대로 남아요.</p>
      </Modal>
    </div>
  );
}

/* ─────────── 상품 등록 / 수정 ─────────── */
function Block({ title, desc, children }) {
  return (
    <section className="panel">
      <div className="px-5 py-3.5 border-b border-line"><h2 className="panel-title">{title}</h2>{desc && <p className="text-[12px] text-mute mt-0.5">{desc}</p>}</div>
      <div className="p-5 space-y-4">{children}</div>
    </section>
  );
}
function Row({ label, req, children }) {
  return (
    <div className="grid md:grid-cols-[140px_1fr] gap-2 md:gap-4 items-start">
      <div className="text-[13px] font-semibold text-ink-2 md:pt-2.5">{label}{req && <span className="text-point">*</span>}</div>
      <div>{children}</div>
    </div>
  );
}

export function SellerProductForm() {
  const { id } = useParams();
  const edit = !!id;
  const src = edit ? productById[id] : null;
  const nav = useNavigate();
  const { toast } = useApp();
  const [name, setName] = useState(src?.name || '');
  const [cat, setCat] = useState(src?.cat || MY_STORE.cat);
  const [sub, setSub] = useState(src?.sub || catById[MY_STORE.cat].subs[0]);
  const [price, setPrice] = useState(src?.price || 0);
  const [disc, setDisc] = useState(src ? Math.round(src.discount * 100) : 0);
  const [opts, setOpts] = useState(src?.options.length ? src.options.map((o) => ({ name: o.name, values: o.values.join(', ') })) : [{ name: '컬러', values: '' }]);
  const [imgs, setImgs] = useState(src?.images || []);
  const [desc, setDesc] = useState(edit ? `<p>${MY_STORE.intro}</p>\n<p>세탁: 찬물 단독 손세탁 / 건조기 사용 금지</p>` : '');
  const [status, setStatus] = useState('판매중');
  const [stocks, setStocks] = useState({}); // 새 조합의 재고 입력값
  const [ask, setAsk] = useState(null); // 확인 창: 'zeroStock' | 'delete'

  const combos = useMemo(() => {
    const lists = opts.filter((o) => o.name && o.values.trim()).map((o) => o.values.split(',').map((v) => v.trim()).filter(Boolean));
    if (!lists.length) return [[]];
    return lists.reduce((acc, l) => acc.flatMap((a) => l.map((v) => [...a, v])), [[]]);
  }, [opts]);
  const hasOptions = combos[0].length > 0;
  const c = catById[cat];
  const sp = Math.round((price * (1 - disc / 100)) / 10) * 10;
  // 수정 화면: 원래 있던 조합은 저장된 재고(읽기 전용), 새로 생긴 조합만 입력
  const savedStock = (cb, i) => (src && cb.every((v) => src.options.some((o) => o.values.includes(v))) ? Math.max(0, Math.round(src.stock / combos.length) - (i % 3) * 4) : null);
  const done = () => { toast(edit ? '상품이 수정되었어요' : '상품이 등록되었어요'); nav('/seller/products'); };
  const submit = () => {
    if (!edit && combos.every((cb) => !Number(stocks[cb.join('/')] || 0))) return setAsk('zeroStock');
    done();
  };

  return (
    <div>
      <PageHead crumbs="상품 > 상품 조회/수정" title={edit ? '상품 수정' : '상품 등록'} desc={edit ? `상품번호 ${src.id.toUpperCase()}` : '필수 항목(*)을 모두 입력하면 바로 판매가 시작됩니다.'} />
      <div className="grid xl:grid-cols-[1fr_320px] gap-4">
        <div className="space-y-4 min-w-0">
          <Block title="카테고리 · 상품명">
            <Row label="카테고리" req>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[11.5px] text-mute mb-1">상위 카테고리</div>
                  <select value={cat} onChange={(e) => { setCat(e.target.value); setSub(catById[e.target.value].subs[0]); }} className="field">{categories.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
                </div>
                <div>
                  <div className="text-[11.5px] text-mute mb-1">하위 카테고리</div>
                  <select value={sub} onChange={(e) => setSub(e.target.value)} className="field">{c.subs.map((s) => <option key={s}>{s}</option>)}</select>
                </div>
              </div>
              <p className="text-[12px] text-mute mt-1.5">카테고리는 운영자가 등록한 목록에서만 선택할 수 있어요 · 판매수수료는 카테고리별로 정산 때 적용돼요</p>
            </Row>
            <Row label="상품명" req>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className="field" placeholder="브랜드명 · 핵심 소재 · 상품 종류 순으로 작성하면 검색에 유리해요" />
              <div className="text-right text-[11.5px] text-mute mt-1 num">{name.length}/100</div>
            </Row>
          </Block>

          <Block title="판매가">
            <Row label="판매가" req><div className="flex items-center gap-2"><input value={price || ''} onChange={(e) => setPrice(Number(e.target.value.replace(/\D/g, '')))} className="field num w-48" /><span className="text-sm">원</span></div></Row>
            <Row label="즉시할인">
              <div className="flex items-center gap-2"><input value={disc || ''} onChange={(e) => setDisc(Math.min(90, Number(e.target.value.replace(/\D/g, ''))))} className="field num w-24" /><span className="text-sm">%</span>
                {disc > 0 && <span className="text-[13px] text-ink-2 ml-2">할인가 <b className="num">{won(sp)}</b></span>}
              </div>
            </Row>
          </Block>

          <Block title="옵션 · 재고" desc="옵션은 최대 2개, 옵션값은 쉼표(,)로 구분하세요. 옵션이 없으면 비워 두고 재고만 입력하세요.">
            {opts.map((o, i) => (
              <div key={i} className="grid grid-cols-[120px_1fr_36px] gap-2">
                <input value={o.name} onChange={(e) => setOpts(opts.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} maxLength={30} className="field" placeholder="옵션명" />
                <input value={o.values} onChange={(e) => setOpts(opts.map((x, k) => (k === i ? { ...x, values: e.target.value } : x)))} className="field" placeholder="예) S, M, L" />
                <button onClick={() => setOpts(opts.filter((_, k) => k !== i))} className="btn btn-ghost px-0"><X size={16} /></button>
              </div>
            ))}
            {opts.length < 2 && <button onClick={() => setOpts([...opts, { name: '', values: '' }])} className="btn btn-line btn-sm">+ 옵션 추가 (최대 2개)</button>}
            <div className="border border-line overflow-x-auto max-h-[420px]">
              <table className="tbl">
                <thead><tr><th>옵션 조합</th><th className="w-32">추가금액</th><th className="w-28">재고<span className="text-point">*</span></th><th className="w-20">판매</th></tr></thead>
                <tbody>
                  {combos.map((cb, i) => {
                    const saved = savedStock(cb, i);
                    return (
                      <tr key={cb.join('/')}>
                        <td>{hasOptions ? cb.join(' / ') : '옵션 없음'}</td>
                        <td><input className="field field-sm num" defaultValue="0" disabled={!hasOptions} /></td>
                        <td>{saved != null ? <span className="num text-ink-2">{saved}</span> : <input className="field field-sm num" value={stocks[cb.join('/')] ?? 0} onChange={(e) => setStocks({ ...stocks, [cb.join('/')]: Number(e.target.value.replace(/\D/g, '')) })} />}</td>
                        <td><Checkbox checked onChange={() => {}} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {edit && <p className="text-[12px] text-mute">저장된 조합의 재고는 상품 목록의 재고 수정에서 바꿔요. 판매 체크를 풀면 그 조합은 삭제돼요(지난 주문은 그대로).</p>}
          </Block>

          <Block title="상품 이미지" desc="최대 5장 · JPG · PNG · WEBP · 한 장 10MB 이하 · 1000×1250px 이상 권장 · 첫 번째 이미지가 대표 이미지">
            <div className="flex flex-wrap gap-2">
              {imgs.map((s, i) => (
                <div key={s} className="relative w-24 h-28">
                  <img src={s} alt="" className="w-full h-full object-cover" />
                  {i === 0
                    ? <span className="absolute left-0 top-0 bg-ink text-white text-[10px] px-1.5 py-0.5">대표</span>
                    : <button onClick={() => setImgs([s, ...imgs.filter((x) => x !== s)])} className="absolute left-1 bottom-1 bg-white/90 text-[10px] px-1">대표로</button>}
                  <button onClick={() => setImgs(imgs.filter((x) => x !== s))} className="absolute right-1 top-1 bg-white/90 p-0.5"><X size={12} /></button>
                </div>
              ))}
              {imgs.length < 5 && <button onClick={() => setImgs([...imgs, `/images/p/p104-${(imgs.length % 3) + 1}.jpg`])} className="w-24 h-28 border border-dashed border-line-2 text-mute text-[12px] flex flex-col items-center justify-center gap-1 hover:border-ink hover:text-ink"><ImagePlus size={20} />추가</button>}
            </div>
          </Block>

          <Block title="상세 설명" desc="HTML 로 작성할 수 있어요(최대 10,000자). 스크립트 · 스타일 같은 위험한 태그는 저장할 때 지워져요.">
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={10000} rows={8} className="field font-mono text-[13px]" placeholder="<p>상품의 특징, 사이즈 가이드, 세탁 방법 등을 작성하세요.</p>" />
            <div className="text-right text-[11.5px] text-mute num">{desc.length}/10,000</div>
          </Block>

          <Block title="상품정보 제공고시" desc="그 밖의 항목(제조자 · 취급 주의사항 · 품질보증기준 등)은 상세 설명에 적어 주세요.">
            <Row label="소재" req><input className="field" maxLength={100} defaultValue={edit ? src.material : ''} /></Row>
            <Row label="제조국" req><input className="field" maxLength={50} defaultValue={edit ? src.origin : ''} /></Row>
          </Block>

        </div>

        {/* 사이드 */}
        <div className="space-y-4 xl:sticky xl:top-20 self-start">
          <div className="panel">
            <div className="panel-head"><span className="panel-title">미리보기</span></div>
            <div className="p-5">
              <div className="aspect-[4/5] bg-sand">{imgs[0] && <img src={imgs[0]} alt="" className="w-full h-full object-cover" />}</div>
              <div className="text-[12px] font-bold text-ink-2 mt-2.5">{MY_STORE.name}</div>
              <div className="text-[13px] text-ink-2">{name || '상품명을 입력하세요'}</div>
              <div className="mt-1"><Price p={{ price: price || 0, discount: disc / 100 }} /></div>
            </div>
          </div>
          <div className="panel p-5 space-y-3">
            <div className="text-[13px] font-semibold">판매 상태</div>
            {edit ? (
              <div className="text-[13px] space-y-1">
                <StatusPill s={src.blocked ? '강제중지' : src.status} />
                {src.statusReason && <p className="text-rust text-[12px]">사유: {src.statusReason}</p>}
                <p className="text-mute text-[12px]">판매중지 · 재개는 상품 목록에서 바꿔요</p>
              </div>
            ) : <Segments items={['판매중', '판매중지']} value={status} onChange={setStatus} />}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button onClick={() => nav('/seller/products')} className="btn btn-line">취소</button>
              <button onClick={submit} className="btn btn-ink">{edit ? '수정 저장' : '등록하기'}</button>
            </div>
            {edit && <button onClick={() => setAsk('delete')} className="btn btn-ghost btn-sm w-full text-rust">상품 삭제</button>}
          </div>
        </div>
      </div>

      <Modal open={ask === 'zeroStock'} onClose={() => setAsk(null)} title="재고 확인" width={420}
        footer={<><button className="btn btn-line btn-sm" onClick={() => setAsk(null)}>재고 입력하기</button><button className="btn btn-ink btn-sm" onClick={done}>그대로 등록</button></>}>
        <p className="text-[14px]">판매할 옵션의 재고가 모두 <b>0</b>이에요.</p>
        <p className="text-[13px] text-mute mt-2">이대로 등록하면 쇼핑몰에 바로 <b>품절</b>로 보여요.</p>
      </Modal>
      <Modal open={ask === 'delete'} onClose={() => setAsk(null)} title="상품 삭제" width={420}
        footer={<><button className="btn btn-line btn-sm" onClick={() => setAsk(null)}>취소</button><button className="btn btn-sm bg-rust text-white border-rust" onClick={() => { toast('상품을 삭제했어요'); nav('/seller/products'); }}>삭제</button></>}>
        <p className="text-[14px]">이 상품을 삭제할까요?</p>
        <p className="text-[13px] text-mute mt-2">삭제한 상품은 쇼핑몰 · 장바구니에서 구매할 수 없게 돼요. 지난 주문과 리뷰는 그대로 남아요.</p>
      </Modal>
    </div>
  );
}
