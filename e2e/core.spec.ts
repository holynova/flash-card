import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('can open today and reveal a study answer', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '今天', exact: true })).toBeVisible()
  await page.getByRole('link', { name: /开始今天的学习/ }).click()
  await expect(page.getByText('问题')).toBeVisible()
  await page.getByRole('button', { name: '显示答案' }).click()
  await expect(page.getByText('答案')).toBeVisible()
  await page.getByRole('button', { name: /良好/ }).click()
  await expect(page.getByRole('button', { name: '撤销上一张' })).toBeVisible()
  await page.getByRole('button', { name: '撤销上一张' }).click()
  await expect(page.getByRole('button', { name: '显示答案' })).toBeVisible()
})

test('can create a deck from the mobile UI', async ({ page }) => {
  await page.goto('/decks')
  await page.getByRole('button', { name: '新建牌组' }).click()
  await page.getByLabel('牌组名称').fill('生物学核心概念')
  await page.getByLabel('一句说明').fill('细胞与遗传')
  await page.getByRole('button', { name: '创建牌组' }).click()
  await expect(page.getByRole('heading', { name: '生物学核心概念' })).toBeVisible()
})

test('can manage cards, deck settings, CSV export and import', async ({ page }) => {
  await page.goto('/decks')
  await page.getByRole('button', { name: '新建牌组' }).click()
  await page.getByLabel('牌组名称').fill('端到端牌组')
  await page.getByLabel('一句说明').fill('核心资料流验证')
  await page.getByRole('button', { name: '创建牌组' }).click()
  await page.getByRole('heading', { name: '端到端牌组' }).click()

  await page.getByLabel('添加卡片').click()
  await page.getByLabel('正面').fill('细胞的能量工厂是什么？')
  await page.getByLabel('背面').fill('线粒体')
  await page.getByRole('button', { name: '保存卡片' }).click()
  await expect(page.getByText('线粒体')).toBeVisible()

  await page.getByRole('button', { name: '编辑卡片' }).click()
  await page.getByLabel('背面').fill('线粒体（Mitochondrion）')
  await page.getByRole('button', { name: '保存修改' }).click()
  await expect(page.getByText('线粒体（Mitochondrion）')).toBeVisible()

  await page.getByRole('button', { name: '牌组设置' }).click()
  await page.getByLabel('牌组名称').fill('细胞生物学')
  await page.getByLabel('每日新卡').fill('12')
  await page.getByRole('button', { name: '保存设置' }).click()
  await expect(page.getByRole('heading', { name: '细胞生物学' })).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('细胞生物学.csv')
  const downloadPath = await download.path()
  expect(downloadPath).not.toBeNull()
  expect(await readFile(downloadPath!, 'utf8')).toContain('线粒体（Mitochondrion）')

  await page.getByRole('link', { name: '导入' }).click()
  await page.getByLabel('目标牌组').selectOption({ label: '细胞生物学' })
  await page.locator('input[type=file]').setInputFiles({
    name: 'biology.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('front,back\nDNA的中文名,脱氧核糖核酸\nRNA的中文名,核糖核酸')
  })
  await expect(page.getByRole('table', { name: '导入预览' })).toBeVisible()
  await page.getByRole('button', { name: '导入 2 张卡片' }).click()
  await expect(page.getByText('2 张卡片已加入牌组')).toBeVisible()
})
