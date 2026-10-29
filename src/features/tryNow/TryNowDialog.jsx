import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import DesignForm from './DesignForm.jsx';

/**
 * Try now pop-up (loaded on demand) — the shared DesignForm inside a <dialog>.
 * Opened imperatively: ref.current.open({ mode }).
 */
const TryNowDialog = forwardRef(function TryNowDialog(_, ref) {
  const dialogRef = useRef(null);
  const formRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const close = () => { formRef.current?.cancel(); dialogRef.current?.close(); };
  useImperativeHandle(ref, () => ({
    open({ mode } = {}) {
      formRef.current?.setMode(mode);
      if (!dialogRef.current.open) dialogRef.current.showModal();
      formRef.current?.focusFirst();
    },
  }));

  return (
    <dialog
      ref={dialogRef} className="try-dialog" aria-labelledby="try-title"
      onClick={(e) => { if (e.target === dialogRef.current && !busy) close(); }}
      onCancel={(e) => { if (busy) e.preventDefault(); }}
    >
      <DesignForm
        ref={formRef} idPrefix="try" onClose={close} onBusyChange={setBusy}
        header={(
          <div className="try-head">
            <div>
              <h2 id="try-title">Design your structure</h2>
              <p className="try-sub">Upload your terrace, garden or plot and see the structure added at your exact size — or design one from scratch.</p>
            </div>
            <button type="button" className="try-close" aria-label="Close" onClick={close}>×</button>
          </div>
        )}
      />
    </dialog>
  );
});

export default TryNowDialog;
