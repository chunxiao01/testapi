/**
 * ============================================================
 * Excel 相关接口（用 exceljs，纯 JS，无需编译）
 *   GET  /api/excel/export    导出数据为 xlsx（可选 token）
 *   GET  /api/excel/template  下载空模板（免 token）
 *   POST /api/excel/import    上传 xlsx 解析成 JSON（需 token）
 * ============================================================
 */
const express = require('express');
const ExcelJS = require('exceljs');
const { upload } = require('../middleware/upload');
const { authRequired, authOptional } = require('../middleware/auth');

const router = express.Router();

// 演示数据源
const EMPLOYEES = [
  { id: 1, name: '张三', age: 28, dept: '研发部', salary: 18000 },
  { id: 2, name: '李四', age: 32, dept: '产品部', salary: 22000 },
  { id: 3, name: '王五', age: 26, dept: '测试部', salary: 15000 },
  { id: 4, name: '赵六', age: 35, dept: '运维部', salary: 25000 },
];

// 表头定义（导出与模板共用）
const COLUMNS = [
  { header: 'ID',   key: 'id',     width: 10 },
  { header: '姓名', key: 'name',   width: 15 },
  { header: '年龄', key: 'age',    width: 10 },
  { header: '部门', key: 'dept',   width: 20 },
  { header: '月薪', key: 'salary', width: 15 },
];

/**
 * 构建工作簿，rows 为空就是模板
 */
function buildWorkbook(rows = []) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'demo-server';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('员工表');
  sheet.columns = COLUMNS;

  // 表头样式
  const head = sheet.getRow(1);
  head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  head.alignment = { vertical: 'middle', horizontal: 'center' };
  head.height = 22;
  head.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF409EFF' } };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  rows.forEach((r) => sheet.addRow(r));
  return workbook;
}

/** 导出 Excel */
router.get('/export', authOptional, async (req, res, next) => {
  try {
    const workbook = buildWorkbook(EMPLOYEES);
    const buffer = await workbook.xlsx.writeBuffer();

    const filename = `employees_${Date.now()}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    // 中文文件名要同时给 filename 和 filename*，否则浏览器会乱码
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="employees.xlsx"; filename*=UTF-8''${encodeURIComponent(filename)}`
    );
    res.send(Buffer.from(buffer));
  } catch (err) {
    next(err);
  }
});

/** 下载导入模板（只有表头） */
router.get('/template', async (req, res, next) => {
  try {
    const workbook = buildWorkbook([]);
    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="template.xlsx"; filename*=UTF-8''${encodeURIComponent('导入模板.xlsx')}`
    );
    res.send(Buffer.from(buffer));
  } catch (err) {
    next(err);
  }
});

/** 导入 Excel：解析成 JSON 返回 */
router.post('/import', authRequired, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ code: 400, msg: '请上传 Excel 文件，字段名应为 file' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);   // 直接读 multer 存下来的临时文件

    const sheet = workbook.worksheets[0];
    if (!sheet) return res.status(400).json({ code: 400, msg: 'Excel 中没有工作表' });

    // 第一行作为表头
    const headers = [];
    sheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber] = String(cell.value ?? `col${colNumber}`).trim();
    });

    // 逐行解析成对象
    const rows = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;   // 跳过表头

      const obj = {};
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        let value = cell.value;

        // exceljs 的单元格可能是公式、富文本、日期等对象，统一转成基础类型
        if (value && typeof value === 'object') {
          if (value.result !== undefined)      value = value.result;
          else if (value.text !== undefined)   value = value.text;
          else if (value instanceof Date)      value = value.toISOString();
          else                                 value = JSON.stringify(value);
        }

        obj[headers[colNumber] || `col${colNumber}`] = value ?? null;
      });
      rows.push(obj);
    });

    res.json({
      code: 0,
      msg: `解析成功，共 ${rows.length} 行数据`,
      data: {
        originalName: req.file.originalname,
        savedAs: req.file.filename,
        headers: headers.filter(Boolean),
        total: rows.length,
        rows,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;