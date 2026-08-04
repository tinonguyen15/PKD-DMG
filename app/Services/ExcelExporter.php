<?php

namespace App\Services;

use ZipArchive;

class ExcelExporter
{
    public static function download(string $filename, array $sheets): never
    {
        if (!class_exists(ZipArchive::class)) {
            self::downloadCsvFallback($filename, $sheets);
        }

        $path = tempnam(sys_get_temp_dir(), 'pkd_xlsx_');
        if ($path === false) {
            throw new \RuntimeException('Không tạo được file tạm để xuất Excel.');
        }

        $zip = new ZipArchive();
        if ($zip->open($path, ZipArchive::OVERWRITE) !== true) {
            throw new \RuntimeException('Không tạo được file Excel.');
        }

        $sheetCount = 0;
        foreach ($sheets as $sheet) {
            if (!empty($sheet['rows'])) {
                $sheetCount++;
            }
        }
        $sheetCount = max(1, $sheetCount);

        $zip->addFromString('[Content_Types].xml', self::contentTypes($sheetCount));
        $zip->addFromString('_rels/.rels', self::rootRels());
        $zip->addFromString('xl/workbook.xml', self::workbook($sheets));
        $zip->addFromString('xl/_rels/workbook.xml.rels', self::workbookRels($sheetCount));
        $zip->addFromString('xl/styles.xml', self::styles());

        $index = 1;
        foreach ($sheets as $sheet) {
            $zip->addFromString("xl/worksheets/sheet{$index}.xml", self::worksheet($sheet['rows'] ?? []));
            $index++;
        }

        $zip->close();

        self::sendFile($path, self::safeFilename($filename, 'xlsx'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }

    private static function worksheet(array $rows): string
    {
        $xmlRows = [];
        foreach (array_values($rows) as $rowIndex => $row) {
            $cells = [];
            foreach (array_values($row) as $columnIndex => $value) {
                $cellRef = self::columnName($columnIndex + 1) . ($rowIndex + 1);
                $style = $rowIndex === 0 ? ' s="1"' : '';
                if (is_int($value) || is_float($value)) {
                    $cells[] = '<c r="' . $cellRef . '"' . $style . '><v>' . $value . '</v></c>';
                    continue;
                }
                $cells[] = '<c r="' . $cellRef . '" t="inlineStr"' . $style . '><is><t>' . self::xml((string) $value) . '</t></is></c>';
            }
            $xmlRows[] = '<row r="' . ($rowIndex + 1) . '">' . implode('', $cells) . '</row>';
        }

        return '<?xml version="1.0" encoding="UTF-8"?>'
            . '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            . '<sheetData>' . implode('', $xmlRows) . '</sheetData>'
            . '</worksheet>';
    }

    private static function workbook(array $sheets): string
    {
        $items = [];
        foreach (array_values($sheets) as $index => $sheet) {
            $name = self::sheetName((string) ($sheet['name'] ?? 'Sheet ' . ($index + 1)));
            $items[] = '<sheet name="' . self::xml($name) . '" sheetId="' . ($index + 1) . '" r:id="rId' . ($index + 1) . '"/>';
        }

        return '<?xml version="1.0" encoding="UTF-8"?>'
            . '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            . '<sheets>' . implode('', $items) . '</sheets>'
            . '</workbook>';
    }

    private static function workbookRels(int $sheetCount): string
    {
        $rels = [];
        for ($i = 1; $i <= $sheetCount; $i++) {
            $rels[] = '<Relationship Id="rId' . $i . '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' . $i . '.xml"/>';
        }
        $rels[] = '<Relationship Id="rId' . ($sheetCount + 1) . '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>';

        return '<?xml version="1.0" encoding="UTF-8"?>'
            . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . implode('', $rels)
            . '</Relationships>';
    }

    private static function contentTypes(int $sheetCount): string
    {
        $overrides = [
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
            '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>',
        ];
        for ($i = 1; $i <= $sheetCount; $i++) {
            $overrides[] = '<Override PartName="/xl/worksheets/sheet' . $i . '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
        }

        return '<?xml version="1.0" encoding="UTF-8"?>'
            . '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            . '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            . '<Default Extension="xml" ContentType="application/xml"/>'
            . implode('', $overrides)
            . '</Types>';
    }

    private static function rootRels(): string
    {
        return '<?xml version="1.0" encoding="UTF-8"?>'
            . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            . '</Relationships>';
    }

    private static function styles(): string
    {
        return '<?xml version="1.0" encoding="UTF-8"?>'
            . '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            . '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
            . '<fills count="1"><fill><patternFill patternType="none"/></fill></fills>'
            . '<borders count="1"><border/></borders>'
            . '<cellStyleXfs count="1"><xf fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
            . '<cellXfs count="2"><xf fontId="0" fillId="0" borderId="0" xfId="0"/><xf fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>'
            . '</styleSheet>';
    }

    private static function downloadCsvFallback(string $filename, array $sheets): never
    {
        $firstSheet = $sheets[0]['rows'] ?? [];
        $safe = self::safeFilename($filename, 'csv');
        header('Content-Type: text/csv; charset=UTF-8');
        header('Content-Disposition: attachment; filename="' . $safe . '"');
        echo "\xEF\xBB\xBF";
        $out = fopen('php://output', 'w');
        foreach ($firstSheet as $row) {
            fputcsv($out, $row);
        }
        exit;
    }

    private static function sendFile(string $path, string $filename, string $contentType): never
    {
        header('Content-Type: ' . $contentType);
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Content-Length: ' . filesize($path));
        readfile($path);
        @unlink($path);
        exit;
    }

    private static function safeFilename(string $filename, string $extension): string
    {
        $base = preg_replace('/[^A-Za-z0-9_.-]+/', '-', pathinfo($filename, PATHINFO_FILENAME)) ?: 'bao-cao';

        return trim($base, '-_.') . '.' . $extension;
    }

    private static function sheetName(string $name): string
    {
        $name = preg_replace('/[\[\]\*\/\\\\\?:]+/', ' ', $name) ?: 'Sheet';

        return mb_substr(trim($name), 0, 31, 'UTF-8') ?: 'Sheet';
    }

    private static function xml(string $value): string
    {
        return htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }

    private static function columnName(int $index): string
    {
        $name = '';
        while ($index > 0) {
            $index--;
            $name = chr(65 + ($index % 26)) . $name;
            $index = intdiv($index, 26);
        }

        return $name;
    }
}
