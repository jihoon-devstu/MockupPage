import { useState, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Search, Upload, X, GripVertical, Eye, Copy, ImagePlus } from 'lucide-react';
import { productsOfStore, productById, categories, catById } from '../../data/catalog';
import { useApp } from '../../lib/store';
import { PageHead, Segments, StatusPill, Checkbox, Pager, Modal, Price } from '../../components/ui';
import { won, comma, ymd, salePrice, cx, pct } from '../../lib/format';
import { MY_STORE } from './SellerLayout';

/* ─────────── 상품 조회/수정 ─────────── */
export function SellerProductList() {
  const { toast } = useApp();
  const [rows, setRows] = useState(() => productsOfStore(MY_STORE.id).map((p) => ({ ...p })));
  const [status, setStatus] = useState('전체');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(new Set());
  const [del, setDel] = useState(false);

  const counts = { 전체: rows.length, 판매중: 0, 품절: 0, 판매중지: 0 };
  rows.forEach((r) => counts[r.status]++);
  const list = rows.filter((r) => (status === '전체' || r.status === status) && r.name.includes(q));
  const allOn = list.length > 0 && list.every((r) => sel.has(r.id));
  const bulk = (st) => { setRows(rows.map((r) => (sel.has(r.id) ? { ...r, status: st } : r))); toast(`${sel.size}개 상품을 '${st}' 처리했어요`); setSel(new Set()); };

  return (
    <div>
      <PageHead title="상품 조회/수정" desc="판매중지 상품은 쇼핑몰에 노출되지 않습니다. 재고가 0이 되면 자동으로 품절 처리됩니다."
        right={<><button className="btn btn-line btn-sm">엑셀 일괄등록</button><Link to="/seller/products/new" className="btn btn-ink btn-sm">+ 상품 등록</Link></>} />

      <div className="panel p-4 flex flex-wrap items-center gap-3">
        <Segments items={['전체', '판매중', '품절', '판매중지']} value={status} onChange={setStatus} counts={counts} />
        <div className="flex items-center border border-line-2 h-9 px-2.5 ml-auto w-full sm:w-72 bg-white">
          <Search size={15} className="text-mute" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="상품명 검색" className="flex-1 px-2 text-[13px] outline-none" />
        </div>
      </div>

      <div className="panel mt-3">
        <div className="flex flex-wrap items-center gap-2 px-4 h-12 border-b border-line text-[13px]">
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
                <th className="w-10"><Checkbox checked={allOn} onChange={(on) => setSel(on ? new Set(list.map((r) => r.id)) : new Set())} /></th>
                <th>상품</th><th>카테고리</th><th className="text-right">판매가</th><th className="text-right">할인가</th><th className="text-right">재고</th><th>상태</th><th className="text-right">판매량</th><th>평점</th><th>등록일</th><th className="text-center">관리</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td><Checkbox checked={sel.has(p.id)} onChange={() => { const n = new Set(sel); n.has(p.id) ? n.delete(p.id) : n.add(p.id); setSel(n); }} /></td>
                  <td>
                    <div className="flex items-center gap-3 min-w-[260px]">
                      <img src={p.images[0]} alt="" className="w-11 h-11 object-cover" />
                      <div><Link to={`/seller/products/${p.id}/edit`} className="font-medium hover:underline">{p.name}</Link><div className="text-[11.5px] text-mute num">{p.id.toUpperCase()} · 옵션 {p.options.reduce((a, o) => a * o.values.length, 1)}개</div></div>
                    </div>
                  </td>
                  <td className="text-ink-2 whitespace-nowrap">{catById[p.cat].name} &gt; {p.sub}</td>
                  <td className="text-right num">{comma(p.price)}</td>
                  <td className="text-right num">{p.discount ? <><span className="text-point">{Math.round(p.discount * 100)}%</span> {comma(salePrice(p))}</> : '-'}</td>
                  <td className={cx('text-right num', p.stock < 20 && 'text-rust font-bold')}>{comma(p.stock)}</td>
                  <td><StatusPill s={p.status} /></td>
                  <td className="text-right num">{comma(p.sold)}</td>
                  <td className="whitespace-nowrap">★ {p.rating} <span className="text-mute num">({comma(p.reviews)})</span></td>
                  <td className="num text-ink-2">{ymd(p.created)}</td>
                  <td>
                    <div className="flex gap-1 justify-center">
                      <Link to={`/seller/products/${p.id}/edit`} className="btn btn-line btn-xs">수정</Link>
                      <Link to={`/products/${p.id}`} className="btn btn-ghost btn-xs px-1.5" title="쇼핑몰에서 보기"><Eye size={14} /></Link>
                      <button onClick={() => toast('상품을 복사했어요 (판매중지 상태로 생성)')} className="btn btn-ghost btn-xs px-1.5" title="복사"><Copy size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager total={1} className="py-4" />
      </div>

      <Modal open={del} onClose={() => setDel(false)} title="상품 삭제" width={420}
        footer={<><button className="btn btn-line btn-sm" onClick={() => setDel(false)}>취소</button><button className="btn btn-sm bg-rust text-white border-rust" onClick={() => { setRows(rows.filter((r) => !sel.has(r.id))); toast(`${sel.size}개 상품을 삭제했어요`); setSel(new Set()); setDel(false); }}>삭제</button></>}>
        <p className="text-[14px]">선택한 <b>{sel.size}개</b> 상품을 삭제할까요?</p>
        <p className="text-[13px] text-mute mt-2">진행 중인 주문이 있는 상품은 삭제할 수 없으며 판매중지 처리됩니다. 삭제된 상품의 리뷰는 보존됩니다.</p>
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
  const [status, setStatus] = useState(src?.status || '판매중');
  const [shipMode, setShipMode] = useState('store');

  const combos = useMemo(() => {
    const lists = opts.filter((o) => o.name && o.values.trim()).map((o) => o.values.split(',').map((v) => v.trim()).filter(Boolean));
    if (!lists.length) return [];
    return lists.reduce((acc, l) => acc.flatMap((a) => l.map((v) => [...a, v])), [[]]);
  }, [opts]);
  const c = catById[cat];
  const sp = Math.round((price * (1 - disc / 100)) / 10) * 10;
  const fee = Math.round(sp * (c.commission + 0.022));

  return (
    <div>
      <PageHead crumbs="상품 > 상품 조회/수정" title={edit ? '상품 수정' : '상품 등록'} desc={edit ? `${src.id.toUpperCase()} · 최근 수정 2026.09.28 14:02` : '필수 항목(*)을 모두 입력하면 바로 판매가 시작됩니다.'} />
      <div className="grid xl:grid-cols-[1fr_320px] gap-4">
        <div className="space-y-4 min-w-0">
          <Block title="카테고리 · 상품명">
            <Row label="카테고리" req>
              <div className="grid grid-cols-2 gap-2">
                <select value={cat} onChange={(e) => { setCat(e.target.value); setSub(catById[e.target.value].subs[0]); }} className="field">{categories.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
                <select value={sub} onChange={(e) => setSub(e.target.value)} className="field">{c.subs.map((s) => <option key={s}>{s}</option>)}</select>
              </div>
              <p className="text-[12px] text-mute mt-1.5">판매수수료 {pct(c.commission)} + 결제수수료 2.2% {cat !== MY_STORE.cat && <span className="text-amber">· 입점 카테고리 외 등록은 관리자 승인 후 노출</span>}</p>
            </Row>
            <Row label="상품명" req>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} className="field" placeholder="브랜드명 · 핵심 소재 · 상품 종류 순으로 작성하면 검색에 유리해요" />
              <div className="text-right text-[11.5px] text-mute mt-1 num">{name.length}/50</div>
            </Row>
          </Block>

          <Block title="판매가 · 재고">
            <Row label="판매가" req><div className="flex items-center gap-2"><input value={price || ''} onChange={(e) => setPrice(Number(e.target.value.replace(/\D/g, '')))} className="field num w-48" /><span className="text-sm">원</span></div></Row>
            <Row label="즉시할인">
              <div className="flex items-center gap-2"><input value={disc || ''} onChange={(e) => setDisc(Math.min(90, Number(e.target.value.replace(/\D/g, ''))))} className="field num w-24" /><span className="text-sm">%</span>
                {disc > 0 && <span className="text-[13px] text-ink-2 ml-2">할인가 <b className="num">{won(sp)}</b></span>}
              </div>
            </Row>
            <Row label="예상 정산액">
              <div className="bg-cream px-4 py-3 text-[13px] num">
                {won(sp)} − 수수료 {won(fee)} = <b className="text-[15px]">{won(sp - fee)}</b> <span className="text-mute font-sans">/ 1개당</span>
              </div>
            </Row>
          </Block>

          <Block title="옵션" desc="조합형 옵션: 옵션값은 쉼표(,)로 구분하세요. 조합별로 재고와 추가금액을 설정할 수 있어요.">
            {opts.map((o, i) => (
              <div key={i} className="grid grid-cols-[120px_1fr_36px] gap-2">
                <input value={o.name} onChange={(e) => setOpts(opts.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} className="field" placeholder="옵션명" />
                <input value={o.values} onChange={(e) => setOpts(opts.map((x, k) => (k === i ? { ...x, values: e.target.value } : x)))} className="field" placeholder="예) S, M, L" />
                <button onClick={() => setOpts(opts.filter((_, k) => k !== i))} className="btn btn-ghost px-0"><X size={16} /></button>
              </div>
            ))}
            {opts.length < 3 && <button onClick={() => setOpts([...opts, { name: '', values: '' }])} className="btn btn-line btn-sm">+ 옵션 추가 (최대 3개)</button>}
            {combos.length > 0 && (
              <div className="border border-line overflow-x-auto">
                <table className="tbl">
                  <thead><tr><th>옵션 조합</th><th className="w-32">추가금액</th><th className="w-28">재고</th><th className="w-24">판매</th></tr></thead>
                  <tbody>
                    {combos.slice(0, 12).map((cb, i) => (
                      <tr key={cb.join()}>
                        <td>{cb.join(' / ')}</td>
                        <td><input className="field field-sm num" defaultValue="0" /></td>
                        <td><input className="field field-sm num" defaultValue={src ? Math.max(0, Math.round(src.stock / combos.length) - (i % 3) * 4) : 0} /></td>
                        <td><Checkbox checked onChange={() => {}} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {combos.length > 12 && <div className="text-[12px] text-mute px-3 py-2">외 {combos.length - 12}개 조합</div>}
              </div>
            )}
          </Block>

          <Block title="상품 이미지" desc="대표 이미지 1장 + 추가 이미지 최대 9장 · 1000×1250px 이상 권장 · 첫 번째 이미지가 대표 이미지">
            <div className="flex flex-wrap gap-2">
              {imgs.map((s, i) => (
                <div key={s} className="relative w-24 h-28 group">
                  <img src={s} alt="" className="w-full h-full object-cover" />
                  {i === 0 && <span className="absolute left-0 top-0 bg-ink text-white text-[10px] px-1.5 py-0.5">대표</span>}
                  <span className="absolute left-1 bottom-1 bg-white/90 p-0.5 cursor-grab"><GripVertical size={12} /></span>
                  <button onClick={() => setImgs(imgs.filter((x) => x !== s))} className="absolute right-1 top-1 bg-white/90 p-0.5"><X size={12} /></button>
                </div>
              ))}
              <button onClick={() => setImgs([...imgs, `/images/p/p104-${(imgs.length % 3) + 1}.jpg`])} className="w-24 h-28 border border-dashed border-line-2 text-mute text-[12px] flex flex-col items-center justify-center gap-1 hover:border-ink hover:text-ink"><ImagePlus size={20} />추가</button>
            </div>
          </Block>

          <Block title="상세 설명">
            <div className="border border-line-2">
              <div className="flex gap-1 px-2 h-10 items-center border-b border-line bg-cream text-[13px] overflow-x-auto no-scrollbar">
                {['B', 'I', 'U', 'H1', 'H2', '이미지', '동영상', '표', '구분선'].map((t) => <button key={t} className="px-2 h-7 hover:bg-white">{t}</button>)}
              </div>
              <div className="p-4 min-h-[160px] text-[14px] text-ink-2 leading-relaxed" contentEditable suppressContentEditableWarning>
                {edit ? <>{MY_STORE.intro}<br /><br />소재: {src.material}<br />세탁: 찬물 단독 손세탁 / 건조기 사용 금지</> : <span className="text-mute">상품의 특징, 사이즈 가이드, 세탁 방법 등을 작성하세요.</span>}
              </div>
            </div>
          </Block>

          <Block title="상품정보 제공고시" desc="전자상거래법에 따라 카테고리별 필수 항목을 입력해야 합니다.">
            {['소재', '제조국', '제조자/수입자', '세탁방법 및 취급 주의사항', '품질보증기준'].map((k, i) => (
              <Row key={k} label={k} req><input className="field" defaultValue={edit ? [src.material, src.origin, MY_STORE.name, '찬물 단독 손세탁', '소비자분쟁해결기준에 따름'][i] : ''} /></Row>
            ))}
          </Block>

          <Block title="배송">
            <Row label="배송비 설정">
              <div className="space-y-2 text-[13px]">
                <label className="flex items-center gap-2"><input type="radio" checked={shipMode === 'store'} onChange={() => setShipMode('store')} /> 스토어 기본 정책 사용 — {MY_STORE.courier} · {won(MY_STORE.shipFee)} ({won(MY_STORE.freeOver)} 이상 무료)</label>
                <label className="flex items-center gap-2"><input type="radio" checked={shipMode === 'custom'} onChange={() => setShipMode('custom')} /> 상품별 개별 설정</label>
                {shipMode === 'custom' && <div className="grid grid-cols-3 gap-2 pl-6"><select className="field field-sm"><option>유료</option><option>무료</option><option>조건부 무료</option></select><input className="field field-sm" placeholder="배송비" /><input className="field field-sm" placeholder="무료 기준 금액" /></div>}
              </div>
            </Row>
            <Row label="출고 소요일"><select className="field w-60"><option>당일 출고 (14시 이전 결제)</option><option>1~2 영업일</option><option>3~5 영업일 (주문제작)</option></select></Row>
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
            <Segments items={['판매중', '판매중지']} value={status === '품절' ? '판매중' : status} onChange={setStatus} />
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button onClick={() => nav('/seller/products')} className="btn btn-line">취소</button>
              <button onClick={() => { toast(edit ? '상품이 수정되었어요' : '상품이 등록되었어요'); nav('/seller/products'); }} className="btn btn-ink">{edit ? '수정 저장' : '등록하기'}</button>
            </div>
            {edit && <button className="btn btn-ghost btn-sm w-full text-rust">상품 삭제</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
