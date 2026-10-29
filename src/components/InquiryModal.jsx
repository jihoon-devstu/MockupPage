// 상품 문의 작성 · 수정 모달 — 상품 상세 Q&A · 마이페이지 상품 문의가 같이 쓴다 (실제 review/components/InquiryModal.jsx)
// target: { productId } 면 작성, { inquiry } 면 수정 · onSubmit({ content, secret })
import { useState } from 'react';
import { Modal, Checkbox } from './ui';

const CONTENT_MAX = 1000;

export default function InquiryModal({ target, onClose, onSubmit }) {
  if (!target) return null;
  return <InquiryForm key={target.inquiry?.id ?? `new-${target.productId}`} target={target} onClose={onClose} onSubmit={onSubmit} />;
}

function InquiryForm({ target, onClose, onSubmit }) {
  const editing = target.inquiry;
  const [content, setContent] = useState(editing?.q ?? '');
  const [secret, setSecret] = useState(editing?.secret ?? false);
  return (
    <Modal open onClose={onClose} title={editing ? '문의 수정' : '상품 문의하기'}
      footer={<>
        <button className="btn btn-line btn-sm" onClick={onClose}>취소</button>
        <button className="btn btn-ink btn-sm" disabled={!content.trim()} onClick={() => onSubmit({ content: content.trim(), secret })}>{editing ? '수정' : '등록'}</button>
      </>}>
      <label className="label" htmlFor="inquiry-content">내용</label>
      <textarea id="inquiry-content" rows={5} maxLength={CONTENT_MAX} value={content} onChange={(e) => setContent(e.target.value)}
        className="field" placeholder="상품에 대해 궁금한 점을 남겨주세요. (개인정보 입력 금지)" />
      <div className="mt-1 text-right text-[11.5px] text-mute num">{content.length} / {CONTENT_MAX.toLocaleString()}</div>
      <Checkbox className="mt-2" checked={secret} onChange={setSecret} label="비밀글로 문의하기 (판매자만 볼 수 있어요)" />
    </Modal>
  );
}
