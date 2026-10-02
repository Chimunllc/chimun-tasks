-- Эхний үлдэгдлийн ГУРАВ ДАХЬ гарын үсэг = CEO-гийн эцсийн баталгаа (2026-10-02)
-- Урсгал: нярав тоолно (stock_opened_*) → ҮАХ захирал хянана (stock_approved_*)
--         → CEO баталгаажуулна (stock_locked_*) → суурь ХӨЛДӨНӨ.
-- Хөлдсөний дараа эхний үлдэгдлийг ДАХИН тоолж/батлаж/буцаах боломжгүй.
-- Залруулга нь ЗӨВХӨН тооллогоор (stock_counts) — тэнд хэн хэзээ юу өөрчилсөн
-- нь мөрөөр үлддэг тул суурь нь хэзээ ч чимээгүй хөдлөхгүй.
alter table products add column if not exists stock_locked_at  timestamptz;
alter table products add column if not exists stock_locked_by  text;

notify pgrst, 'reload schema';
