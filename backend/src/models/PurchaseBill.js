// PurchaseBill Model/Repository
const { query, queryOne } = require('../utils/database');

class PurchaseBill {
    static async create(billData) {
        const sql = `
      INSERT INTO purchase_bills (franchise_id, bill_number, bill_date, supplier_id, total_amount, total_gst, notes, bill_image_url, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const result = await query(sql, [
            billData.franchiseId,
            billData.bill_number || null,
            billData.bill_date,
            billData.supplier_id || null,
            billData.total_amount || 0,
            billData.total_gst || 0,
            billData.notes || null,
            billData.bill_image_url || null,
            billData.status || 'draft',
            billData.created_by
        ]);

        return { id: result.insertId, ...billData };
    }



    static async findByFranchise(franchiseId, limit = 100, offset = 0) {
        const sql = `
            SELECT pb.*, s.name as supplier_name,
                (SELECT COUNT(*) FROM purchase_bill_items pbi WHERE pbi.purchase_bill_id = pb.id) as items_count
            FROM purchase_bills pb
            LEFT JOIN suppliers s ON pb.supplier_id = s.id
            WHERE pb.franchise_id = ? AND pb.deleted_at IS NULL
            ORDER BY pb.bill_date DESC
            LIMIT ? OFFSET ?
        `;
        return await query(sql, [franchiseId, limit, offset]);
    }

    static async findById(id) {
        const sql = `
            SELECT pb.*, s.name as supplier_name,
                (SELECT COUNT(*) FROM purchase_bill_items pbi WHERE pbi.purchase_bill_id = pb.id) as items_count
            FROM purchase_bills pb
            LEFT JOIN suppliers s ON pb.supplier_id = s.id
            WHERE pb.id = ? AND pb.deleted_at IS NULL
        `;
        return await queryOne(sql, [id]);
    }

    static async update(id, billData) {
        let updateFields = [];
        let values = [];

        Object.entries(billData).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                updateFields.push(`${key} = ?`);
                values.push(value);
            }
        });

        if (updateFields.length === 0) {
            return await this.findById(id);
        }

        let sql = 'UPDATE purchase_bills SET ' + updateFields.join(', ') + ' WHERE id = ?';
        values.push(id);

        await query(sql, values);
        return await this.findById(id);
    }

    static async delete(id) {
        const sql = 'UPDATE purchase_bills SET deleted_at = NOW() WHERE id = ?';
        await query(sql, [id]);
    }

    // Bill items methods
    static async addItem(itemData) {
        const sql = `
      INSERT INTO purchase_bill_items (purchase_bill_id, product_id, hsn_code, item_name, quantity, rate, gst_percentage, gst_amount, total_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const result = await query(sql, [
            itemData.purchase_bill_id,
            itemData.product_id || null,
            itemData.hsn_code || null,
            itemData.item_name,
            itemData.quantity,
            itemData.rate,
            itemData.gst_percentage || 0,
            itemData.gst_amount || 0,
            itemData.total_amount
        ]);

        return { id: result.insertId, ...itemData };
    }

    static async getItems(billId) {
        const sql = `
      SELECT pbi.*, p.sku, p.name as product_name
      FROM purchase_bill_items pbi
      LEFT JOIN products p ON pbi.product_id = p.id
      WHERE pbi.purchase_bill_id = ?
      ORDER BY pbi.id
    `;
        return await query(sql, [billId]);
    }

    static async updateItem(itemId, itemData) {
        let updateFields = [];
        let values = [];

        Object.entries(itemData).forEach(([key, value]) => {
            if (value !== undefined) {
                updateFields.push(`${key} = ?`);
                values.push(value);
            }
        });

        if (updateFields.length === 0) {
            return;
        }

        let sql = 'UPDATE purchase_bill_items SET ' + updateFields.join(', ') + ' WHERE id = ?';
        values.push(itemId);

        await query(sql, values);
    }

    static async deleteItem(itemId) {
        const sql = 'DELETE FROM purchase_bill_items WHERE id = ?';
        await query(sql, [itemId]);
    }

    static async deleteAllItems(billId) {
        const sql = 'DELETE FROM purchase_bill_items WHERE purchase_bill_id = ?';
        await query(sql, [billId]);
    }
}

module.exports = PurchaseBill;
