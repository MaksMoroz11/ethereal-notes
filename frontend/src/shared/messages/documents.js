export const documentText = {
	export: 'Экспорт', exporting: 'Создание файла…', exported: 'Файл готов',
	conflict: 'Документ изменён другим участником. Ваш черновик сохранён.',
	loadServer: 'Загрузить серверную версию', keepMine: 'Сохранить мой текст',
	restoredFrom: version => `Восстановлена из v${version}`,
	restoreConfirmation: (version, date) => `Создадим новую версию со ссылкой на v${version} от ${date}. Все сохранённые версии останутся в истории.`,
	untitled: 'Без названия', loading: 'Загрузка документов…', loadError: 'Не удалось загрузить документы:', select: 'Создайте или выберите документ слева', unknownAuthor: 'неизвестно', saving: 'сохраняю…', unsaved: 'есть несохранённые изменения', saved: 'сохранено', autoSave: 'Автосохранение', titlePlaceholder: 'Название документа', retrySave: 'Повторить сохранение', current: 'К текущей', versions: 'Версии', emptyVersions: 'Пока нет сохранённых версий', restore: 'Откатить', restoreTitle: 'Откатить документ?',
}
