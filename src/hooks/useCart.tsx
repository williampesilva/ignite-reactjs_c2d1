import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import Cart from '../pages/Cart';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  function attCart(updatedCart: Product[]) {
    setCart(updatedCart);
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
  }

  // const prevCartRef = useRef<Product[]>();

  // useEffect(() => {
  //   prevCartRef.current = cart;
  // })

  // const cartPreviousValue = prevCartRef.current ?? cart;

  // useEffect(() => {
  //   if (cartPreviousValue !== cart) {
  //     localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
  //   }
  // }, [cart, cartPreviousValue]);

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart]; // Referencia o updatedCart ao cart, garantindo a imutabilidade
      const productExists = updatedCart.find(product => product.id === productId); // Procura o produto no carrinho

      const stock = await api.get(`/stock/${productId}`); // Busca o produto desejado no bd para verificar quantidade em estoque
      
      const stockAmount = stock.data.amount; // Seleciona a quantidade de itens existentes em estoque do produto
      const currentAmount = productExists ? productExists.amount : 0; // Se o produto existe no carrinho, tras a quantidade no carrinho, se não existir determina como 0
      const amount = currentAmount + 1; // Adiciona uma unidade do produto para posteriormente adicionar ao carrinho

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productExists) {
        productExists.amount = amount; // Insere a quantidade no carrinho, se o produto ja existir
      } else {
        const product = await api.get(`/products/${productId}`); // Busca o produto no banco de dados para repassar os dados ao carrinho

        const newProduct = {  // Constrói o produto que será inserido no carrinho
          ...product.data,    // Trás os dados do produto, porém, em sua construção não existe o amount
          amount: 1,          // Inserimos item amount na construção do item do carrinho
        }
        updatedCart.push(newProduct);
      }
      attCart(updatedCart);
      //setCart(updatedCart);
      // localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart]; // Referencia ao Cart
      const productExists = updatedCart.find(product => product.id === productId); // Procura o produto no carrinho

      if (!productExists) {
        throw Error();
      } else {
        updatedCart.splice(updatedCart.indexOf(productExists), 1);
        attCart(updatedCart);
        //setCart(updatedCart);
        // localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({ productId, amount }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const stock = await api.get(`/stock/${productId}`);

      const stockAmount = stock.data.amount;

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      } 

      const updatedCart = [...cart];
      const productExist = updatedCart.find(product => product.id === productId);

      if (productExist) {
        productExist.amount = amount;
        attCart(updatedCart);
        //setCart(updatedCart);
        // localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else {
        throw Error();
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
